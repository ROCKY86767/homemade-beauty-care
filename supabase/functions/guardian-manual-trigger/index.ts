import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const githubToken = Deno.env.get("AI_GUARDIAN_GITHUB_TOKEN") || "";
  if (!supabaseUrl || !anonKey) {
    return Response.json({ error: "Supabase configuration is missing" }, { status: 500, headers: corsHeaders });
  }
  if (!githubToken) {
    return Response.json({ error: "AI_GUARDIAN_GITHUB_TOKEN secret is not configured in Supabase Edge Functions." }, { status: 503, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401, headers: corsHeaders });
  }

  const { data: access, error: accessError } = await supabase.rpc("get_staff_access");
  if (accessError || access?.role !== "admin" || access?.is_active !== true) {
    return Response.json({ error: "Admin access required" }, { status: 403, headers: corsHeaders });
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/ROCKY86767/homemade-beauty-care/actions/workflows/ai-website-guardian.yml/dispatches",
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );

    if (response.status !== 204) {
      const detail = await response.text();
      console.error("GitHub workflow dispatch failed:", response.status, detail.slice(0, 500));
      return Response.json({ error: "GitHub could not start the audit. Check the GitHub token permissions and workflow status." }, { status: 502, headers: corsHeaders });
    }

    return Response.json({
      ok: true,
      message: "Manual audit request GitHub Actions-এ পাঠানো হয়েছে। Audit শেষ হলে রিপোর্ট এখানে দেখা যাবে।",
    }, { status: 202, headers: corsHeaders });
  } catch (error) {
    console.error("Manual Guardian trigger failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Could not contact GitHub Actions." }, { status: 502, headers: corsHeaders });
  }
});
