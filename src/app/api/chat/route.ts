import { NextRequest, NextResponse } from "next/server";
import { getDecryptedKey } from "@/lib/crypto";
import { scanInput, scanOutput, checkRateLimit, logInjectionEvent } from "@/lib/ai-guard";
import { getSystemPrompt, getInjectionWarning } from "@/lib/system-prompts";
import { recordSuccess, recordFailure, getAvailableProvider, FALLBACK_CHAINS } from "@/lib/api-health";

function getUserId(): string {
  return process.env.DEFAULT_USER_ID || "00000000-0000-0000-0000-000000000001";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, system, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const userId = getUserId();

    const rateResult = checkRateLimit(userId);
    if (!rateResult.allowed) {
      return NextResponse.json({ content: rateResult.reason }, { status: 429 });
    }

    const lastMessage = messages[messages.length - 1]?.content || "";
    const history = messages.slice(0, -1);
    const scan = scanInput(lastMessage, history);

    if (scan.action === "block") {
      checkRateLimit(userId, true);
      logInjectionEvent({ severity: "hard", provider: "anthropic", patternsMatched: scan.patternsMatched, userId, actionTaken: "blocked" });
      return NextResponse.json({ content: "I can't process that request. Please rephrase your question." });
    }

    if (scan.action === "flag") {
      checkRateLimit(userId, true);
      logInjectionEvent({ severity: "soft", provider: "anthropic", patternsMatched: scan.patternsMatched, userId, actionTaken: "flagged" });
    }

    const provider = getAvailableProvider(FALLBACK_CHAINS.chat);
    if (!provider) {
      return NextResponse.json({ content: "AI services are currently unreachable. Please try again shortly." });
    }

    const keys = await getDecryptedKey(provider);
    const apiKey = keys?.key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: `No API key configured for ${provider}` }, { status: 500 });
    }

    let systemPrompt = system || getSystemPrompt("anthropic", context);
    if (scan.action === "flag") {
      systemPrompt += "\n\n" + getInjectionWarning();
    }

    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) recordFailure(provider, "rate_limit");
      else if (status === 401) recordFailure(provider, "auth_error");
      else recordFailure(provider, "server_error");
      return NextResponse.json({ error: `AI provider error: ${status}` }, { status });
    }

    recordSuccess(provider);
    const data = await response.json();
    const text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";

    const outputScan = scanOutput(text);
    if (outputScan.compromised) {
      logInjectionEvent({ severity: "hard", provider, patternsMatched: [outputScan.reason || "output_compromised"], userId, actionTaken: "blocked" });
      return NextResponse.json({ content: "I encountered an issue generating that response. Please try rephrasing your question." });
    }

    return NextResponse.json({ content: text });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
