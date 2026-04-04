import { NextRequest, NextResponse } from "next/server";
import { getDecryptedKey } from "@/lib/crypto";
import { scanInput, scanOutput, checkRateLimit, logInjectionEvent } from "@/lib/ai-guard";
import { getSystemPrompt, getInjectionWarning } from "@/lib/system-prompts";
import { recordSuccess, recordFailure, isAvailable } from "@/lib/api-health";

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

    // ── Try LaunchLemonade first, then Anthropic — no fallback, just use whichever has a key ──
    const llKeys = await getDecryptedKey("launchlemonade");
    const anthropicKeys = await getDecryptedKey("anthropic");
    const anthropicEnvKey = process.env.ANTHROPIC_API_KEY;

    let text: string;

    if (llKeys?.key && llKeys?.extra && isAvailable("launchlemonade")) {
      // ── LaunchLemonade ──
      let llResponse: Response;
      try {
        llResponse = await fetch("https://api.launchlemonade.app/v1/chat", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${llKeys.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lemonade_id: llKeys.extra,
            message: lastMessage,
            conversation_id: body.conversation_id || undefined,
          }),
        });
      } catch {
        recordFailure("launchlemonade", "server_error");
        return NextResponse.json({ content: "Unable to reach LaunchLemonade. Please check your connection and try again." });
      }

      if (!llResponse.ok) {
        const status = llResponse.status;
        if (status === 429) recordFailure("launchlemonade", "rate_limit");
        else if (status === 401) recordFailure("launchlemonade", "auth_error");
        else recordFailure("launchlemonade", "server_error");
        return NextResponse.json({ error: `LaunchLemonade error: ${status}` }, { status });
      }

      recordSuccess("launchlemonade");
      const data = await llResponse.json();
      text = data.response || "";

    } else if ((anthropicKeys?.key || anthropicEnvKey) && isAvailable("anthropic")) {
      // ── Anthropic ──
      const apiKey = anthropicKeys?.key || anthropicEnvKey!;

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
        if (status === 429) recordFailure("anthropic", "rate_limit");
        else if (status === 401) recordFailure("anthropic", "auth_error");
        else recordFailure("anthropic", "server_error");
        return NextResponse.json({ error: `AI provider error: ${status}` }, { status });
      }

      recordSuccess("anthropic");
      const data = await response.json();
      text = data.content?.map((c: { text?: string }) => c.text || "").join("") || "";

    } else {
      // ── No provider configured ──
      return NextResponse.json({ content: "No AI provider is configured. Go to Settings to add an API key." });
    }

    const outputScan = scanOutput(text);
    if (outputScan.compromised) {
      logInjectionEvent({ severity: "hard", provider: "chat", patternsMatched: [outputScan.reason || "output_compromised"], userId, actionTaken: "blocked" });
      return NextResponse.json({ content: "I encountered an issue generating that response. Please try rephrasing your question." });
    }

    return NextResponse.json({ content: text });
  } catch (err) {
    console.error("[chat] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
