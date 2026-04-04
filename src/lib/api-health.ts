// ── 60 Watts of Clarity — API Health / Circuit Breaker ──

export type CircuitState = "closed" | "open" | "half-open";
export type ErrorType = "rate_limit" | "auth_error" | "timeout" | "server_error";

export interface ProviderHealth {
  provider: string;
  state: CircuitState;
  failureCount: number;
  failureTimestamps: number[];
  lastFailure: number | null;
  lastSuccess: number | null;
  openedAt: number | null;
  errorType: ErrorType | null;
}

export interface HealthStatus {
  health: "healthy" | "degraded" | "down";
  health_message: string | null;
}

const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 60_000;
const COOLDOWN_MS = 30_000;
const IMMEDIATE_OPEN_ERRORS: ErrorType[] = ["rate_limit", "auth_error"];

const healthMap = new Map<string, ProviderHealth>();

function getOrCreate(provider: string): ProviderHealth {
  let h = healthMap.get(provider);
  if (!h) {
    h = {
      provider, state: "closed", failureCount: 0, failureTimestamps: [],
      lastFailure: null, lastSuccess: null, openedAt: null, errorType: null,
    };
    healthMap.set(provider, h);
  }
  return h;
}

export function getHealth(provider: string): ProviderHealth {
  return getOrCreate(provider);
}

export function recordSuccess(provider: string): void {
  const h = getOrCreate(provider);
  h.lastSuccess = Date.now();
  h.failureCount = 0;
  h.failureTimestamps = [];
  h.errorType = null;
  h.openedAt = null;
  h.state = "closed";
}

export function recordFailure(provider: string, errorType: ErrorType): void {
  const h = getOrCreate(provider);
  const now = Date.now();
  h.lastFailure = now;
  h.errorType = errorType;
  if (IMMEDIATE_OPEN_ERRORS.includes(errorType)) {
    h.state = "open";
    h.openedAt = now;
    return;
  }
  h.failureTimestamps.push(now);
  h.failureTimestamps = h.failureTimestamps.filter((t) => now - t < FAILURE_WINDOW_MS);
  h.failureCount = h.failureTimestamps.length;
  if (h.state === "half-open") {
    h.state = "open";
    h.openedAt = now;
    return;
  }
  if (h.failureCount >= FAILURE_THRESHOLD) {
    h.state = "open";
    h.openedAt = now;
  }
}

export function isAvailable(provider: string): boolean {
  const h = getOrCreate(provider);
  if (h.state === "closed") return true;
  if (h.state === "open") {
    if (h.openedAt && Date.now() - h.openedAt >= COOLDOWN_MS) {
      h.state = "half-open";
      return true;
    }
    return false;
  }
  return true;
}

export function getHealthStatus(provider: string): HealthStatus {
  const h = getOrCreate(provider);
  if (h.state === "closed") return { health: "healthy", health_message: null };
  if (h.state === "half-open") return { health: "degraded", health_message: "Service recovering — testing connection" };
  if (h.errorType === "auth_error") return { health: "down", health_message: "Your API key may be invalid or expired" };
  if (h.errorType === "rate_limit") return { health: "down", health_message: "Provider rate limit reached — will retry shortly" };
  const since = h.openedAt ? new Date(h.openedAt).toLocaleTimeString() : "unknown";
  return { health: "down", health_message: `API unreachable since ${since}` };
}

export function resetHealth(): void { healthMap.clear(); }

export const FALLBACK_CHAINS: Record<string, string[]> = {
  chat: ["anthropic", "launchlemonade"],
  research: ["perplexity", "anthropic"],
  youtube: ["youtube", "anthropic"],
};

export function getAvailableProvider(chain: string[]): string | null {
  for (const provider of chain) {
    if (isAvailable(provider)) return provider;
  }
  return null;
}
