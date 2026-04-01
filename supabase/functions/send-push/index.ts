import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  PushMessageError,
  type PushSubscription,
  importVapidKeys,
} from "jsr:@negrel/webpush@0.5.0";

function corsHeaders(
  origin: string | null,
  allowedOrigin: string,
): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":
      origin && origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  status: number,
  body: unknown,
  origin: string | null,
  allowedOrigin: string,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin, allowedOrigin),
      "Content-Type": "application/json",
    },
  });
}

function validatePushInput(
  input: unknown,
  appUrl: string,
):
  | { ok: true; data: { title: string; body: string; url: string } }
  | { ok: false; error: string } {
  const MAX_TITLE = 120;
  const MAX_BODY = 1000;
  const MAX_URL = 2048;

  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const raw = input as Record<string, unknown>;

  const title = raw.title ?? "Notification";
  const body = raw.body ?? "";
  const url = raw.url ?? "/";

  if (
    typeof title !== "string" ||
    typeof body !== "string" ||
    typeof url !== "string"
  ) {
    return { ok: false, error: "title, body, and url must be strings" };
  }

  const normalizedTitle = title.trim();
  const normalizedBody = body.trim();
  const normalizedUrl = url.trim();

  if (!normalizedTitle) return { ok: false, error: "title cannot be empty" };
  if (normalizedTitle.length > MAX_TITLE) {
    return { ok: false, error: `title too long (max ${MAX_TITLE})` };
  }
  if (normalizedBody.length > MAX_BODY) {
    return { ok: false, error: `body too long (max ${MAX_BODY})` };
  }
  if (!normalizedUrl || normalizedUrl.length > MAX_URL) {
    return { ok: false, error: `url invalid/too long (max ${MAX_URL})` };
  }

  // Allow relative URLs, or absolute URLs matching APP_URL origin only
  try {
    if (normalizedUrl.startsWith("/")) {
      // relative path is allowed
    } else {
      const target = new URL(normalizedUrl);
      const app = new URL(appUrl);
      if (target.origin !== app.origin) {
        return {
          ok: false,
          error: "url must be relative or same-origin as APP_URL",
        };
      }
    }
  } catch {
    return { ok: false, error: "url is not a valid URL/path" };
  }

  return {
    ok: true,
    data: {
      title: normalizedTitle,
      body: normalizedBody,
      url: normalizedUrl,
    },
  };
}

async function getAppServer() {
  const vapidSubject =
    Deno.env.get("VAPID_SUBJECT") ??
    Deno.env.get("VAPID_URL") ??
    "mailto:admin@example.com";

  const vapidKeysJson = Deno.env.get("VAPID_KEYS_JSON") ?? "";
  if (!vapidKeysJson) {
    throw new Error(
      "Missing VAPID_KEYS_JSON (expected exported JWK keys JSON)",
    );
  }

  let exportedKeys: any;
  try {
    exportedKeys = JSON.parse(vapidKeysJson);
  } catch {
    throw new Error("VAPID_KEYS_JSON is not valid JSON");
  }

  const vapidKeys = await importVapidKeys(exportedKeys);

  return await ApplicationServer.new({
    contactInformation: vapidSubject,
    vapidKeys,
  });
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const appUrl = Deno.env.get("APP_URL") ?? "";

  if (!appUrl) {
    return new Response(JSON.stringify({ error: "Missing APP_URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let allowedOrigin: string;
  try {
    allowedOrigin = new URL(appUrl).origin;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid APP_URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Restrict browser-origin calls to APP_URL origin
  if (origin && origin !== allowedOrigin) {
    return json(403, { error: "Origin not allowed" }, origin, allowedOrigin);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders(origin, allowedOrigin),
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, origin, allowedOrigin);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json(
        500,
        {
          error:
            "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
        },
        origin,
        allowedOrigin,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(
        401,
        { error: "Missing Authorization header" },
        origin,
        allowedOrigin,
      );
    }

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await authed.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) {
      return json(401, { error: "Unauthorized" }, origin, allowedOrigin);
    }

    const parsed = validatePushInput(
      await req.json().catch(() => null),
      appUrl,
    );
    if (!parsed.ok) {
      return json(400, { error: parsed.error }, origin, allowedOrigin);
    }

    const payload = JSON.stringify(parsed.data);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: rows, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, subscription")
      .eq("user_id", user.id);

    if (error) throw error;

    if (!rows?.length) {
      return json(
        200,
        { sent: 0, failed: 0, message: "No subscriptions for user" },
        origin,
        allowedOrigin,
      );
    }

    const appServer = await getAppServer();

    const results = await Promise.allSettled(
      rows.map(async (row: any) => {
        const subscription: PushSubscription = row.subscription ?? {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };

        try {
          const subscriber = appServer.subscribe(subscription);
          await subscriber.pushTextMessage(payload, {});
          return { ok: true };
        } catch (err: any) {
          if (err instanceof PushMessageError && err.isGone?.()) {
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", row.endpoint)
              .eq("user_id", user.id);
          }
          throw err;
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return json(200, { sent, failed }, origin, allowedOrigin);
  } catch (err) {
    return json(
      500,
      { error: "Function error", details: String(err) },
      origin,
      allowedOrigin,
    );
  }
});
