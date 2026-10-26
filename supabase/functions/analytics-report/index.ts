import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const b64url = (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

async function googleAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + "." + claim;

  // Accept the complete PEM key from the Google service-account JSON.
  // Also tolerate literal \\n sequences if they were pasted into the Supabase secret.
  const normalizedKey = privateKey.replace(/\\n/g, "\n").trim();
  const pemMatch = normalizedKey.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  if (!pemMatch) {
    throw new Error("Google private key format is invalid. Please save the complete private_key value from the Google service-account JSON in GOOGLE_PRIVATE_KEY.");
  }
  const pem = pemMatch[1].replace(/[^A-Za-z0-9+/=]/g, "");
  let der: Uint8Array;
  try {
    der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("Google private key could not be decoded. Please replace GOOGLE_PRIVATE_KEY with the complete private_key value from the downloaded JSON file.");
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  ));
  const assertion = unsigned + "." + b64url(signature);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(result?.error_description || result?.error || "Google authorization failed. Check the service account credentials and Analytics property access.");
  }
  return result.access_token as string;
}

async function analyticsPost(token: string, propertyId: string, method: string, body: unknown) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || "Google Analytics Data API request failed.");
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in to the admin panel." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Admin login required." }, 401);

    const { data: staff, error: staffError } = await userClient.rpc("get_staff_access");
    const staffRole = Array.isArray(staff) ? staff?.[0]?.role : staff?.role;
    if (staffError || staffRole !== "admin") return json({ error: "Only the main admin can view website analytics." }, 403);

    const propertyId = Deno.env.get("GOOGLE_ANALYTICS_PROPERTY_ID");
    const serviceEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    if (!propertyId || !serviceEmail || !privateKey) {
      return json({ error: "Setup incomplete: add the three Google Analytics secrets to Supabase." }, 503);
    }

    let requestedRange: { startDate?: string; endDate?: string } = {};
    try {
      requestedRange = await req.json();
    } catch {
      // Use today's report if the request body is empty or invalid JSON.
    }
    const datePattern = /^\\d{4}-\\d{2}-\\d{2}$/;
    const startDate = requestedRange.startDate || "today";
    const endDate = requestedRange.endDate || "today";
    const isRelativeToday = startDate === "today" && endDate === "today";
    if (!isRelativeToday && (!datePattern.test(startDate) || !datePattern.test(endDate) || startDate > endDate)) {
      return json({ error: "Invalid date range. Use YYYY-MM-DD and ensure the start date is on or before the end date." }, 400);
    }

    const token = await googleAccessToken(serviceEmail.trim(), privateKey);
    const selectedDateRange = [{ startDate, endDate }];
    const [realtime, selectedPeriod, pages, sources] = await Promise.all([
      analyticsPost(token, propertyId.trim(), "runRealtimeReport", { metrics: [{ name: "activeUsers" }] }),
      analyticsPost(token, propertyId.trim(), "runReport", { dateRanges: selectedDateRange, metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }] }),
      analyticsPost(token, propertyId.trim(), "runReport", { dateRanges: selectedDateRange, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], limit: 10, orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }] }),
      analyticsPost(token, propertyId.trim(), "runReport", { dateRanges: selectedDateRange, dimensions: [{ name: "sessionSourceMedium" }], metrics: [{ name: "sessions" }], limit: 10, orderBys: [{ metric: { metricName: "sessions" }, desc: true }] }),
    ]);

    return json({
      activeUsers: Number(realtime?.rows?.[0]?.metricValues?.[0]?.value || 0),
      todayUsers: Number(selectedPeriod?.rows?.[0]?.metricValues?.[0]?.value || 0),
      pageViews: Number(selectedPeriod?.rows?.[0]?.metricValues?.[1]?.value || 0),
      topPages: (pages?.rows || []).map((row: any) => ({ page: row.dimensionValues?.[0]?.value || "/", views: Number(row.metricValues?.[0]?.value || 0) })),
      sources: (sources?.rows || []).map((row: any) => ({ source: row.dimensionValues?.[0]?.value || "(direct) / (none)", sessions: Number(row.metricValues?.[0]?.value || 0) })),
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("analytics-report error", error);
    return json({ error: error instanceof Error ? error.message : "Analytics request failed." }, 502);
  }
});
