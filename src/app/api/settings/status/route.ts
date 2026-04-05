import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/api-health";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const ALL_PROVIDERS = ["anthropic", "launchlemonade", "perplexity", "youtube", "pubmed"];

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

export async function GET() {
  try {
    const userId = getUserId();
    const token = await getAdminToken();
    const res = await fetch(
      `${DIRECTUS_URL}/items/user_api_keys?filter[user_id][_eq]=${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const records = data.data || [];

    const providers: Record<
      string,
      {
        connected: boolean;
        hint: string | null;
        extra_hint?: string | null;
        health: string;
        health_message: string | null;
      }
    > = {};

    for (const p of ALL_PROVIDERS) {
      const record = records.find((r: { provider: string }) => r.provider === p);
      const healthStatus = getHealthStatus(p);
      providers[p] = {
        connected: !!record,
        hint: record?.key_hint || null,
        extra_hint: record?.extra_hint || null,
        health: record ? healthStatus.health : "healthy",
        health_message: record ? healthStatus.health_message : null,
      };
    }
    return NextResponse.json({ providers });
  } catch {
    const providers: Record<string, unknown> = {};
    for (const p of ALL_PROVIDERS) {
      providers[p] = { connected: false, hint: null, health: "healthy", health_message: null };
    }
    return NextResponse.json({ providers });
  }
}
