import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: cors }); }
function getClientIp(req: Request): string | null {
  const candidates = [req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), req.headers.get("x-real-ip"), req.headers.get("cf-connecting-ip")];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && value.length <= 64 && /^[0-9a-fA-F:.]+$/.test(value)) return value;
  }
  return null;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const ipAddress = getClientIp(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Visitor presence is not configured." }, 503);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    type GeoLocation = { city: string | null; region: string | null; country: string | null; country_code: string | null };
    const emptyLocation: GeoLocation = { city: null, region: null, country: null, country_code: null };
    const getGeoLocation = async (visitorId: string): Promise<GeoLocation> => {
      if (!ipAddress) return emptyLocation;
      const { data: cached } = await admin.from("site_visitor_presence")
        .select("ip_address,city,region,country,country_code")
        .eq("visitor_id", visitorId).maybeSingle();
      if (cached?.ip_address === ipAddress && (cached.city || cached.region || cached.country)) {
        return { city: cached.city || null, region: cached.region || null, country: cached.country || null, country_code: cached.country_code || null };
      }
      try {
        const response = await fetch(`https://ipwho.is/${encodeURIComponent(ipAddress)}?fields=success,city,region,country,country_code`, { signal: AbortSignal.timeout(2500) });
        if (!response.ok) return emptyLocation;
        const geo = await response.json();
        if (!geo?.success) return emptyLocation;
        return {
          city: typeof geo.city === "string" ? geo.city.slice(0, 100) : null,
          region: typeof geo.region === "string" ? geo.region.slice(0, 100) : null,
          country: typeof geo.country === "string" ? geo.country.slice(0, 100) : null,
          country_code: typeof geo.country_code === "string" ? geo.country_code.slice(0, 3) : null,
        };
      } catch { return emptyLocation; }
    };
    if (body.mode === "heartbeat" || body.mode === "pageview") {
      const visitorId = String(body.visitorId || "");
      if (!validId(visitorId)) return json({ error: "Invalid visitor session." }, 400);
      const geo = await getGeoLocation(visitorId);
      const currentPath = String(body.currentPath || "/").slice(0, 500);
      const pageTitle = String(body.pageTitle || "").slice(0, 200);
      const trafficSource = String(body.trafficSource || "(direct) / (none)").slice(0, 200);
      const referrerHost = String(body.referrerHost || "").slice(0, 200);
      if (body.mode === "pageview") {
        const createdAt = new Date().toISOString();
        const { error: eventError } = await admin.from("site_page_view_events").insert({
          visitor_id: visitorId, ip_address: ipAddress, ...geo, page_path: currentPath, page_title: pageTitle,
          traffic_source: trafficSource, referrer_host: referrerHost, created_at: createdAt
        });
        if (eventError) throw eventError;
        const sessionId = String(body.sessionId || "");
        if (validId(sessionId)) {
          const { error: journeyError } = await admin.from("site_visitor_journey_events").insert({
            visitor_id: visitorId, ip_address: ipAddress, ...geo, session_id: sessionId, event_type: "page_view",
            page_path: currentPath, page_title: pageTitle, traffic_source: trafficSource,
            referrer_host: referrerHost, created_at: createdAt
          });
          if (journeyError) throw journeyError;
        }
      }
      const { error } = await admin.from("site_visitor_presence").upsert({
        visitor_id: visitorId, ip_address: ipAddress, ...geo, last_seen_at: new Date().toISOString(),
        current_path: currentPath, page_title: pageTitle, traffic_source: trafficSource, referrer_host: referrerHost
      }, { onConflict: "visitor_id" });
      if (error) throw error;
      await admin.from("site_visitor_presence").delete().lt("last_seen_at", new Date(Date.now() - 86400000).toISOString());
    }
    if (body.mode === "journey-event") {
      const visitorId = String(body.visitorId || "");
      const sessionId = String(body.sessionId || "");
      if (!validId(visitorId) || !validId(sessionId)) return json({ error: "Invalid visitor session." }, 400);
      const geo = await getGeoLocation(visitorId);
      const eventType = String(body.eventType || "");
      if (!["click", "page_exit"].includes(eventType)) return json({ error: "Invalid event type." }, 400);
      const { error } = await admin.from("site_visitor_journey_events").insert({
        visitor_id: visitorId,
        ip_address: ipAddress,
        ...geo,
        session_id: sessionId,
        event_type: eventType,
        page_path: String(body.currentPath || "/").slice(0, 500),
        page_title: String(body.pageTitle || "").slice(0, 200),
        traffic_source: String(body.trafficSource || "Direct / none").slice(0, 200),
        referrer_host: String(body.referrerHost || "").slice(0, 200),
        element_text: String(body.elementText || "").slice(0, 200),
        element_tag: String(body.elementTag || "").slice(0, 30),
        element_href: String(body.elementHref || "").slice(0, 500),
        duration_seconds: Math.max(0, Math.min(86400, Number(body.durationSeconds || 0))),
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.mode === "journey-report") {
      const auth = req.headers.get("Authorization") || "";
      if (!auth.startsWith("Bearer ")) return json({ error: "Admin login required." }, 401);
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!anonKey) return json({ error: "Auth is not configured." }, 503);
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      if (userError || !userData.user) return json({ error: "Admin login required." }, 401);
      const { data: staff, error: staffError } = await userClient.rpc("get_staff_access");
      const staffRole = Array.isArray(staff) ? staff?.[0]?.role : staff?.role;
      if (staffError || staffRole !== "admin") return json({ error: "Only the main admin can view visitor journeys." }, 403);
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      const startDate = String(body.startDate || "");
      const endDate = String(body.endDate || "");
      if (!datePattern.test(startDate) || !datePattern.test(endDate) || startDate > endDate) return json({ error: "Invalid date range." }, 400);
      const from = new Date(startDate + "T00:00:00+06:00").toISOString();
      const to = new Date(new Date(endDate + "T00:00:00+06:00").getTime() + 86400000).toISOString();
      const { data: events, error } = await admin.from("site_visitor_journey_events")
        .select("id,visitor_id,ip_address,city,region,country,country_code,session_id,event_type,page_path,page_title,traffic_source,referrer_host,element_text,element_tag,element_href,duration_seconds,created_at")
        .gte("created_at", from).lt("created_at", to)
        .order("created_at", { ascending: false }).limit(3000);
      if (error) throw error;
      return json({ events: events || [], total: (events || []).length });
    }
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Admin login required." }, 401);
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) return json({ error: "Auth is not configured." }, 503);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Admin login required." }, 401);
    const { data: staff, error: staffError } = await userClient.rpc("get_staff_access");
    const staffRole = Array.isArray(staff) ? staff?.[0]?.role : staff?.role;
    if (staffError || staffRole !== "admin") return json({ error: "Only the main admin can view live visitor IP addresses." }, 403);
    const { data, error } = await admin.from("site_visitor_presence")
      .select("visitor_id,ip_address,city,region,country,country_code,last_seen_at,current_path,page_title,traffic_source,referrer_host")
      .gte("last_seen_at", new Date(Date.now() - 75000).toISOString())
      .order("last_seen_at", { ascending: false }).limit(100);
    if (error) throw error;
    const uniqueByIp = new Map<string, { ipAddress: string | null; city: string | null; region: string | null; country: string | null; countryCode: string | null; page: string; title: string; source: string; referrerHost: string; lastSeenAt: string }>();
    for (const row of data || []) {
      const key = row.ip_address || row.visitor_id;
      if (!uniqueByIp.has(key)) uniqueByIp.set(key, {
        ipAddress: row.ip_address || null,
        city: row.city || null,
        region: row.region || null,
        country: row.country || null,
        countryCode: row.country_code || null,
        page: row.current_path || "/",
        title: row.page_title || "",
        source: row.traffic_source || "(direct) / (none)",
        referrerHost: row.referrer_host || "",
        lastSeenAt: row.last_seen_at,
      });
    }
    const visitors = Array.from(uniqueByIp.values());
    return json({ activeVisitors: visitors.length, visitors });
  } catch (error) {
    console.error("visitor-presence error", error);
    return json({ error: error instanceof Error ? error.message : "Visitor count failed." }, 500);
  }
});