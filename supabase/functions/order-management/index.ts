import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

function out(x: any, s = 200) {
  return new Response(JSON.stringify(x), {
    status: s,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function admin(req: Request) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const u = await db.auth.getUser(t);
  if (u.error || !u.data.user) throw new Error("Authentication required.");
  const a = await db.from("admin_users").select("user_id").eq("user_id", u.data.user.id).maybeSingle();
  if (!a.data) throw new Error("Admin access required.");
}

function get(obj: any, path: string) {
  return String(path || "").split(".").filter(Boolean).reduce((a, k) => a == null ? undefined : a[k], obj);
}

function render(v: any, ctx: any): any {
  if (typeof v === "string") {
    const m = v.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (m) return get(ctx, m[1]);
    return v.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => {
      const x = get(ctx, p);
      return x == null ? "" : String(x);
    });
  }
  if (Array.isArray(v)) return v.map(x => render(x, ctx));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, render(x, ctx)]));
  return v;
}

function joinUrl(base: string, path: string) {
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

function pathWithId(path: string, id: string) {
  return String(path || "").replace(/\{(?:id|order_id|external_order_id)\}/g, encodeURIComponent(id));
}

async function secrets(id: string) {
  const r = await db.rpc("get_runtime_order_management_secrets", { p_integration_id: id });
  if (r.error) throw new Error("Secret load failed: " + r.error.message);
  return r.data || {};
}

function authHeaders(st: any, s: any) {
  const h: any = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(st.request_headers || {}),
  };
  if (st.auth_type === "bearer" && s.API_KEY) h[st.auth_header || "Authorization"] = "Bearer " + s.API_KEY;
  if (st.auth_type === "api_key" && s.API_KEY) h[st.auth_header || "X-API-Key"] = s.API_KEY;
  if (st.auth_type === "basic" && s.USERNAME) {
    h.Authorization = "Basic " + btoa(String(s.USERNAME) + ":" + String(s.PASSWORD || ""));
  }
  return h;
}

async function pathaoHeaders(cfg: any, s: any) {
  const base = String(cfg.base_url || "https://api-hermes.pathao.com").replace(/\/$/, "");
  const tokenBody = {
    client_id: s.API_KEY,
    client_secret: s.API_SECRET,
    username: s.USERNAME,
    password: s.PASSWORD,
    grant_type: "password",
  };
  const tokenRes = await fetch(base + "/aladdin/api/v1/issue-token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(tokenBody),
  });
  const tokenRaw = await tokenRes.text();
  let tokenData: any;
  try { tokenData = JSON.parse(tokenRaw); } catch { tokenData = {}; }
  const accessToken = tokenData?.access_token || tokenData?.data?.access_token;
  if (!tokenRes.ok || !accessToken) {
    throw new Error("Pathao authentication failed: " + tokenRaw.slice(0, 1000));
  }
  return {
    base,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken,
    },
  };
}

async function createPathaoOrder(id: string, integrationId: string, cfg: any, s: any) {
  const existingLink = await db.from("order_management_links")
    .select("id,external_order_id,external_invoice_url,last_status,last_error")
    .eq("integration_id", integrationId).eq("order_id", id).maybeSingle();

  if (existingLink.data?.external_order_id) {
    return {
      skipped: true,
      message: "Pathao order is already created.",
      integration: cfg.name,
      external_order_id: existingLink.data.external_order_id,
      status: existingLink.data.last_status || null,
    };
  }

  const { order, items } = await loadOrder(id);
  const ps = cfg.provider_settings || {};
  const storeId = Number(ps.store_id);
  if (!storeId) throw new Error("Pathao Store ID is required.");
  const itemWeight = Math.min(10, Math.max(0.5, Number(ps.item_weight || 0.5)));
  const deliveryType = Number(ps.delivery_type || 48);
  const itemType = Number(ps.item_type || 2);
  const itemQuantity = Math.max(1, items.reduce((sum: number, x: any) => sum + Number(x.quantity || 1), 0));
  const amountToCollect = String(order.payment_method || "").toLowerCase().includes("cod")
    || String(order.payment_method || "").toLowerCase().includes("cash")
    ? Number(order.grand_total || order.total || 0)
    : 0;

  const auth = await pathaoHeaders(cfg, s);
  const body = {
    store_id: storeId,
    merchant_order_id: order.order_number,
    recipient_name: order.customer_name || "Customer",
    recipient_phone: String(order.mobile || "").replace(/\s/g, ""),
    recipient_secondary_phone: order.alt_phone || undefined,
    recipient_address: order.address || "",
    delivery_type: deliveryType,
    item_type: itemType,
    special_instruction: order.order_note || "",
    item_quantity: itemQuantity,
    item_weight: itemWeight,
    amount_to_collect: Math.max(0, Math.round(amountToCollect)),
    item_description: items.map((x: any) => x.product_name || x.name || "Product").filter(Boolean).join(", ").slice(0, 200),
  };

  const path = cfg.create_order_path || "/aladdin/api/v1/orders";
  const r = await fetch(joinUrl(auth.base, path), {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!r.ok) throw new Error("Pathao API " + r.status + ": " + (typeof data === "string" ? data : JSON.stringify(data)));

  const ext = data?.data?.consignment_id || data?.consignment_id;
  const status = data?.data?.order_status || data?.order_status || "Pending";
  if (!ext) throw new Error("Pathao did not return a consignment ID: " + JSON.stringify(data));

  await db.from("order_management_links").upsert({
    integration_id: integrationId,
    order_id: id,
    external_order_id: String(ext),
    external_invoice_url: null,
    last_status: String(status),
    last_synced_at: new Date().toISOString(),
    last_error: null,
  }, { onConflict: "integration_id,order_id" });

  await db.from("orders").update({
    pathao_consignment_id: String(ext),
    pathao_status: String(status),
    pathao_created_at: new Date().toISOString(),
    pathao_last_synced_at: new Date().toISOString(),
    pathao_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  return {
    success: true,
    integration: cfg.name,
    external_order_id: String(ext),
    consignment_id: String(ext),
    status: String(status),
    response: data,
  };
}

async function syncPathao(link: any, cfg: any, s: any) {
  if (!link.external_order_id) return { skipped: true, message: "No Pathao consignment ID saved." };
  const auth = await pathaoHeaders(cfg, s);
  const path = pathWithId(cfg.status_path || "/aladdin/api/v1/orders/{id}/info", String(link.external_order_id));
  const r = await fetch(joinUrl(auth.base, path), { method: "GET", headers: auth.headers });
  const raw = await r.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!r.ok) throw new Error("Pathao status API " + r.status + ": " + (typeof data === "string" ? data : JSON.stringify(data)));
  const status = data?.data?.order_status || data?.order_status || link.last_status || null;
  await db.from("order_management_links").update({
    last_status: status ? String(status) : link.last_status,
    last_synced_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", link.id);
  await db.from("orders").update({
    pathao_status: status ? String(status) : null,
    pathao_last_synced_at: new Date().toISOString(),
    pathao_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", link.order_id);
  return { success: true, integration: cfg.name, external_order_id: link.external_order_id, status: status || null, response: data };
}

async function loadOrder(id: string) {
  const o = await db.from("orders").select("*").eq("id", id).single();
  if (o.error || !o.data) throw new Error("Order not found.");
  const i = await db.from("order_items").select("*").eq("order_id", id);
  return { order: o.data, items: i.data || [] };
}

async function createOne(id: string, integrationId: string) {
  const st = await db.from("order_management_integrations").select("*").eq("id", integrationId).single();
  if (st.error || !st.data) throw new Error("Integration not found.");
  const cfg = st.data;
  if (!cfg.enabled) return { skipped: true, message: "Integration is disabled." };

  const existingLink = await db
    .from("order_management_links")
    .select("id,external_order_id,external_invoice_url,last_status,last_error")
    .eq("integration_id", integrationId)
    .eq("order_id", id)
    .maybeSingle();

  if (existingLink.data?.external_order_id) {
    return {
      skipped: true,
      message: "Order is already created in this integration.",
      integration: cfg.name,
      external_order_id: existingLink.data.external_order_id,
      invoice_url: existingLink.data.external_invoice_url || null,
      status: existingLink.data.last_status || null,
    };
  }

  if (!cfg.base_url || !cfg.create_order_path) throw new Error("Base URL and Create Order API path are required.");

  const { order, items } = await loadOrder(id);
  const s = await secrets(integrationId);
  if (String(cfg.provider || '').toLowerCase() === 'pathao') {
    return createPathaoOrder(id, integrationId, cfg, s);
  }
  const ctx = {
    order,
    items,
    customer: { name: order.customer_name, mobile: order.mobile, alt_mobile: order.alt_phone, email: order.email },
    totals: { subtotal: order.subtotal, delivery_charge: order.delivery_charge, discount: order.discount, grand_total: order.grand_total },
    website: { order_id: order.order_number, payment_method: order.payment_method },
  };
  const body = render(cfg.create_order_template, ctx);
  const createMethod = String(cfg.create_order_method || "POST").toUpperCase();
  const r = await fetch(joinUrl(cfg.base_url, cfg.create_order_path), {
    method: createMethod,
    headers: authHeaders(cfg, s),
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!r.ok) throw new Error("Order management API " + r.status + ": " + (typeof data === "string" ? data : JSON.stringify(data)));

  const ext = cfg.external_order_id_path ? get(data, cfg.external_order_id_path) : null;
  const inv = cfg.external_invoice_url_path ? get(data, cfg.external_invoice_url_path) : null;
  const status = cfg.status_response_path ? get(data, cfg.status_response_path) : null;
  const tracking = cfg.tracking_response_path ? get(data, cfg.tracking_response_path) : null;

  await db.from("order_management_links").upsert({
    integration_id: integrationId,
    order_id: id,
    external_order_id: ext ? String(ext) : null,
    external_invoice_url: inv ? String(inv) : null,
    last_status: status != null ? String(status) : null,
    last_synced_at: new Date().toISOString(),
    last_error: null,
  }, { onConflict: "integration_id,order_id" });

  return { success: true, integration: cfg.name, external_order_id: ext || null, invoice_url: inv || null, tracking_url: tracking || null, status: status || null, response: data };
}

async function syncOne(link: any) {
  const stRes = await db.from("order_management_integrations").select("*").eq("id", link.integration_id).single();
  if (stRes.error || !stRes.data) throw new Error("Integration not found.");
  const cfg = stRes.data;
  if (!cfg.enabled) return { skipped: true, message: "Integration is disabled." };
  if (!link.external_order_id) return { skipped: true, message: "No external order ID saved." };
  if (!cfg.status_path) return { skipped: true, message: "Status API path is not configured." };

  const s = await secrets(cfg.id);
  if (String(cfg.provider || '').toLowerCase() === 'pathao') {
    return syncPathao(link, cfg, s);
  }
  const path = pathWithId(cfg.status_path, String(link.external_order_id));
  const method = String(cfg.status_request_method || "GET").toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : JSON.stringify(render(cfg.status_request_template || {}, { link }));
  const r = await fetch(joinUrl(cfg.base_url, path), { method, headers: authHeaders(cfg, s), body });
  const raw = await r.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!r.ok) throw new Error("Status API " + r.status + ": " + (typeof data === "string" ? data : JSON.stringify(data)));

  const status = cfg.status_response_path ? get(data, cfg.status_response_path) : null;
  await db.from("order_management_links").update({
    last_status: status != null ? String(status) : link.last_status,
    last_synced_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", link.id);

  return { success: true, integration: cfg.name, external_order_id: link.external_order_id, status: status || link.last_status, response: data };
}

async function webhook(p: any, req: Request) {
  const id = String(p.integration_id || "");
  if (!id) throw new Error("integration_id is required.");
  const q = await db.from("order_management_integrations").select("*").eq("id", id).single();
  if (q.error || !q.data) throw new Error("Integration not found.");
  const cfg = q.data;
  const secret = (await secrets(id)).WEBHOOK_SECRET;
  const header = cfg.webhook_secret_header || "x-webhook-secret";
  if (!secret) return out({ success: false, message: "Webhook secret is not configured." }, 403);
  if (req.headers.get(header) !== secret) return out({ success: false, message: "Invalid webhook secret." }, 401);

  if (cfg.webhook_enabled === false) return out({ success: false, message: "Webhook is disabled." }, 403);
  const payload = p.payload ?? p.data ?? p;
  const externalId = cfg.webhook_order_id_path ? get(payload, cfg.webhook_order_id_path) : null;
  const status = cfg.webhook_status_path ? get(payload, cfg.webhook_status_path) : null;
  const paymentStatus = cfg.webhook_payment_status_path ? get(payload, cfg.webhook_payment_status_path) : null;
  if (!externalId) throw new Error("Webhook external order ID could not be mapped.");

  const link = await db.from("order_management_links").select("*").eq("integration_id", id).eq("external_order_id", String(externalId)).maybeSingle();
  if (link.error || !link.data) throw new Error("No linked website order found for external order ID.");

  const orderPatch: any = { updated_at: new Date().toISOString() };
  const map: Record<string, string[]> = {
    pending: ["Pending"], placed: ["Order Placed"], confirmed: ["Confirmed"], processing: ["Processing"],
    shipped: ["Shipped"], delivered: ["Delivered"], cancelled: ["Cancelled"], canceled: ["Cancelled"],
  };
  if (status != null) {
    const normalized = String(status).trim().toLowerCase();
    const configured = cfg.status_mapping && typeof cfg.status_mapping === "object" ? cfg.status_mapping[normalized] : null;
    const mapped = configured || map[normalized]?.[0];
    if (mapped) orderPatch.status = String(mapped);
  }
  if (paymentStatus != null) orderPatch.payment_status = String(paymentStatus);

  await db.from("orders").update(orderPatch).eq("id", link.data.order_id);
  await db.from("order_management_links").update({
    last_status: status != null ? String(status) : link.data.last_status,
    last_synced_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", link.data.id);

  return out({ success: true, order_id: link.data.order_id, external_order_id: String(externalId), status: status || null });
}

async function createGuestOrder(p: any) {
  const orderNumber = String(p.order_number || "");
  const mobile = String(p.mobile || "").replace(/\s/g, "");
  const token = String(p.token || "");

  if (!orderNumber || !/^01[0-9]{9}$/.test(mobile) || !token) {
    throw new Error("Invalid guest dispatch request.");
  }

  const orderRes = await db
    .from("orders")
    .select("id,order_number,mobile,created_at,integration_dispatch_token_hash,integration_dispatch_token_issued_at")
    .eq("order_number", orderNumber)
    .eq("mobile", mobile)
    .maybeSingle();

  if (orderRes.error || !orderRes.data) {
    throw new Error("Order not found.");
  }

  const order = orderRes.data;
  const issuedAt = order.integration_dispatch_token_issued_at
    ? new Date(order.integration_dispatch_token_issued_at)
    : null;

  if (!issuedAt || issuedAt.getTime() < Date.now() - 10 * 60 * 1000) {
    throw new Error("Integration dispatch window expired.");
  }

  const tokenHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  const computedHash = Array.from(new Uint8Array(tokenHash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  if (
    !order.integration_dispatch_token_hash ||
    computedHash !== order.integration_dispatch_token_hash
  ) {
    throw new Error("Invalid integration dispatch token.");
  }

  const integrations = await db
    .from("order_management_integrations")
    .select("id")
    .eq("enabled", true)
    .order("created_at");

  if (integrations.error) throw integrations.error;

  const results = [];
  for (const integration of integrations.data || []) {
    try {
      results.push(
        await createOne(String(order.id), String(integration.id))
      );
    } catch (e) {
      results.push({
        success: false,
        integration_id: integration.id,
        message: e instanceof Error ? e.message : "Integration failed",
      });
    }
  }

  return {
    success: results.some(x => x.success) || results.length === 0,
    dispatched: results.length,
    results,
  };
}

async function main(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ success: false, message: "POST required" }, 405);

  const p = await req.json().catch(() => ({}));
  const a = p.action;

  if (a === "webhook") return webhook(p, req);

  if (a === "create_guest") {
    return out(await createGuestOrder(p));
  }

  if (a === "test") {
    await admin(req);
    const q = await db.from("order_management_integrations").select("*").eq("id", p.integration_id).single();
    if (q.error || !q.data) throw new Error("Integration not found.");
    const st = q.data, s = await secrets(st.id);
    if (String(st.provider || '').toLowerCase() === 'pathao') {
      const auth = await pathaoHeaders(st, s);
      const r = await fetch(joinUrl(auth.base, st.status_path || '/aladdin/api/v1/stores'), { method: 'GET', headers: auth.headers });
      const raw = await r.text();
      await db.from("order_management_integrations").update({
        last_tested_at: new Date().toISOString(),
        last_test_status: r.ok ? "success" : "failed",
        last_test_message: raw.slice(0, 1000),
        updated_at: new Date().toISOString(),
      }).eq("id", st.id);
      return out({ success: r.ok, status: r.status, message: r.ok ? "Pathao connection successful." : "Pathao returned " + r.status, response: raw.slice(0, 2000) });
    }
    const testPath = st.create_order_path || st.status_path || "";
    const r = await fetch(joinUrl(st.base_url, testPath), { method: "GET", headers: authHeaders(st, s) });
    const raw = await r.text();
    await db.from("order_management_integrations").update({
      last_tested_at: new Date().toISOString(),
      last_test_status: r.ok ? "success" : "failed",
      last_test_message: raw.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq("id", st.id);
    return out({ success: r.ok, status: r.status, message: r.ok ? "Connection successful." : "Connection returned " + r.status, response: raw.slice(0, 2000) });
  }

  if (a === "create") {
    await admin(req);
    const ids = Array.isArray(p.integration_ids) ? p.integration_ids : [];
    const results = [];
    for (const id of ids) {
      try { results.push(await createOne(String(p.order_id), String(id))); }
      catch (e) { results.push({ success: false, integration_id: id, message: e instanceof Error ? e.message : "Integration failed" }); }
    }
    return out({ success: results.some(x => x.success), results });
  }

  if (a === "sync") {
    await admin(req);
    const q = p.integration_id
      ? await db.from("order_management_links").select("*").eq("integration_id", String(p.integration_id))
      : await db.from("order_management_links").select("*");
    if (q.error) throw q.error;
    const results = [];
    for (const link of (q.data || [])) {
      try { results.push(await syncOne(link)); }
      catch (e) { results.push({ success: false, link_id: link.id, message: e instanceof Error ? e.message : "Sync failed" }); }
    }
    return out({ success: results.some(x => x.success), results });
  }

  throw new Error("Unknown integration action.");
}

Deno.serve(async req => {
  try { return await main(req); }
  catch (e) { console.error(e); return out({ success: false, message: e instanceof Error ? e.message : "Integration failed" }, 400); }
});
