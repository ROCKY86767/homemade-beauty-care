import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: access, error: accessError } =
      await userClient.rpc("get_staff_access");

    if (accessError || access?.role !== "admin" || access?.is_active !== true) {
      return new Response(
        JSON.stringify({ error: "Only an active admin can create moderator accounts." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.display_name ?? "Moderator").trim() || "Moderator";
    const permissions = body.permissions && typeof body.permissions === "object" ? body.permissions : {};
    const isActive = body.is_active !== false;

    if (!email || !email.includes("@")) throw new Error("Valid moderator email is required.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");

    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) throw new Error(createError.message);
    if (!created.user) throw new Error("Moderator account could not be created.");

    const { error: profileError } = await adminClient
      .from("moderator_users")
      .upsert({
        user_id: created.user.id,
        email,
        display_name: displayName,
        permissions,
        is_active: isActive,
      }, { onConflict: "user_id" });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: created.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unable to create moderator." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});