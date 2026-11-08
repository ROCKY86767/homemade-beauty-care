import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-ai-guardian-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function text(value: unknown, max = 3000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const expectedSecret = Deno.env.get("AI_GUARDIAN_INGEST_SECRET") || "";
  const suppliedSecret = request.headers.get("x-ai-guardian-secret") || "";
  if (!expectedSecret || !safeEqual(suppliedSecret, expectedSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Supabase server configuration is missing" }, { status: 500, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    if (!body || typeof body.run_id !== "string" || !body.run_id.trim()) {
      return Response.json({ error: "run_id is required" }, { status: 400, headers: corsHeaders });
    }

    const allowedStatuses = new Set(["completed", "failed", "partial"]);
    const allowedFixStatuses = new Set(["not_attempted", "no_fix_needed", "pr_created", "failed", "skipped"]);
    const findings = Array.isArray(body.findings)
      ? body.findings.slice(0, 80).map((finding: Record<string, unknown>) => ({
          title: text(finding?.title, 180),
          message: text(finding?.message, 1200),
          severity: text(finding?.severity, 20),
          category: text(finding?.category, 80),
          page: text(finding?.page, 300),
        }))
      : [];

    const report = {
      run_id: body.run_id.slice(0, 120),
      status: allowedStatuses.has(body.status) ? body.status : "partial",
      trigger_source: text(body.trigger_source, 40) || "schedule",
      started_at: body.started_at || new Date().toISOString(),
      completed_at: body.completed_at || new Date().toISOString(),
      health_score: Number.isFinite(Number(body.health_score))
        ? Math.max(0, Math.min(100, Math.round(Number(body.health_score))))
        : null,
      summary: text(body.summary, 3000),
      findings,
      metrics: body.metrics && typeof body.metrics === "object" && !Array.isArray(body.metrics)
        ? body.metrics
        : {},
      fix_status: allowedFixStatuses.has(body.fix_status) ? body.fix_status : "not_attempted",
      fix_branch: text(body.fix_branch, 200) || null,
      fix_pr_url: text(body.fix_pr_url, 500) || null,
      deployment_url: text(body.deployment_url, 500) || null,
    };

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase
      .from("ai_guardian_reports")
      .upsert(report, { onConflict: "run_id" });

    if (error) {
      console.error("AI Guardian report insert failed:", error.message);
      return Response.json({ error: "Could not save report" }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ ok: true, run_id: report.run_id }, { headers: corsHeaders });
  } catch (error) {
    console.error("AI Guardian request failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Invalid report payload" }, { status: 400, headers: corsHeaders });
  }
});
