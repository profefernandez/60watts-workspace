import { NextRequest, NextResponse } from "next/server";
import { encrypt, extractHint, validateEncryptionSecret } from "@/lib/crypto";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const VALID_PROVIDERS = ["anthropic", "launchlemonade", "perplexity", "youtube", "pubmed"];

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.DIRECTUS_ADMIN_EMAIL || "jason@60watts.com",
      password: process.env.DIRECTUS_ADMIN_PASSWORD || "changeme",
    }),
  });
  const data = await res.json();
  return data.data.access_token;
}

function getUserId(): string {
  return process.env.DEFAULT_USER_ID || "00000000-0000-0000-0000-000000000001";
}

export async function POST(request: NextRequest) {
  try {
    validateEncryptionSecret();
    const body = await request.json();
    const { provider, api_key, agent_id } = body;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!api_key && provider !== "pubmed") {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const userId = getUserId();
    const token = await getAdminToken();

    const encryptedKey = encrypt(api_key);
    const keyHint = extractHint(api_key);

    let extraEncrypted: string | null = null;
    let extraHint: string | null = null;
    if (agent_id) {
      extraEncrypted = encrypt(agent_id);
      extraHint = extractHint(agent_id);
    }

    const existingRes = await fetch(
      `${DIRECTUS_URL}/items/user_api_keys?filter[user_id][_eq]=${userId}&filter[provider][_eq]=${provider}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const existing = await existingRes.json();

    if (existing.data && existing.data.length > 0) {
      const id = existing.data[0].id;
      await fetch(`${DIRECTUS_URL}/items/user_api_keys/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_key: encryptedKey, key_hint: keyHint,
          extra_encrypted: extraEncrypted, extra_hint: extraHint,
        }),
      });
    } else {
      await fetch(`${DIRECTUS_URL}/items/user_api_keys`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId, provider,
          encrypted_key: encryptedKey, key_hint: keyHint,
          extra_encrypted: extraEncrypted, extra_hint: extraHint,
        }),
      });
    }

    return NextResponse.json(
      { provider, connected: true, key_hint: keyHint, extra_hint: extraHint },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider } = body;
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    const userId = getUserId();
    const token = await getAdminToken();
    const existingRes = await fetch(
      `${DIRECTUS_URL}/items/user_api_keys?filter[user_id][_eq]=${userId}&filter[provider][_eq]=${provider}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const existing = await existingRes.json();
    if (existing.data && existing.data.length > 0) {
      await fetch(`${DIRECTUS_URL}/items/user_api_keys/${existing.data[0].id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return NextResponse.json({ provider, connected: false });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
