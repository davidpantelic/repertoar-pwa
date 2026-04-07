import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const deriveWrappingKey = async (secret: string, userId: string) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("repertoar-note-key-salt"),
      info: encoder.encode(`note-key:${userId}`),
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
};

const wrapRawKey = async (rawKey: string, wrappingKey: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    base64ToBytes(rawKey),
  );

  return JSON.stringify({
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    version: 1,
  });
};

const unwrapRawKey = async (wrappedKey: string, wrappingKey: CryptoKey) => {
  const parsed = JSON.parse(wrappedKey) as {
    ciphertext: string;
    iv: string;
  };

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(parsed.iv),
    },
    wrappingKey,
    base64ToBytes(parsed.ciphertext),
  );

  return bytesToBase64(new Uint8Array(plaintext));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const noteWrappingSecret = Deno.env.get("NOTE_KEY_WRAPPING_SECRET");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !noteWrappingSecret
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required function secrets" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "ensure" | "load" | undefined;
    const rawKey = body?.rawKey as string | undefined;

    const wrappingKey = await deriveWrappingKey(noteWrappingSecret, user.id);

    const { data: existingMaterial, error: selectError } = await serviceClient
      .from("user_note_keys")
      .select("wrapped_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (action === "load") {
      if (!existingMaterial?.wrapped_key) {
        return new Response(JSON.stringify({ rawKey: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const unwrappedKey = await unwrapRawKey(
        existingMaterial.wrapped_key,
        wrappingKey,
      );

      return new Response(JSON.stringify({ rawKey: unwrappedKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ensure") {
      if (existingMaterial?.wrapped_key) {
        const unwrappedKey = await unwrapRawKey(
          existingMaterial.wrapped_key,
          wrappingKey,
        );

        return new Response(JSON.stringify({ rawKey: unwrappedKey }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!rawKey) {
        return new Response(JSON.stringify({ error: "Missing rawKey" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wrappedKey = await wrapRawKey(rawKey, wrappingKey);
      const { error: upsertError } = await serviceClient
        .from("user_note_keys")
        .upsert(
          {
            user_id: user.id,
            wrapped_key: wrappedKey,
            key_version: 1,
          },
          { onConflict: "user_id" },
        );

      if (upsertError) throw upsertError;

      return new Response(JSON.stringify({ rawKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
