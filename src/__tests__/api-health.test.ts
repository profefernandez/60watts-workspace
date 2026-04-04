import { describe, it, expect, beforeEach } from "vitest";
import {
  getHealth,
  recordSuccess,
  recordFailure,
  isAvailable,
  resetHealth,
  getHealthStatus,
} from "../lib/api-health";

describe("api-health (circuit breaker)", () => {
  beforeEach(() => resetHealth());

  describe("initial state", () => {
    it("starts in closed state", () => {
      expect(getHealth("anthropic").state).toBe("closed");
    });
    it("is available when closed", () => {
      expect(isAvailable("anthropic")).toBe(true);
    });
  });

  describe("failure tracking", () => {
    it("stays closed after 1-2 failures", () => {
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      expect(getHealth("anthropic").state).toBe("closed");
    });
    it("opens after 3 failures within 60s", () => {
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      expect(getHealth("anthropic").state).toBe("open");
      expect(isAvailable("anthropic")).toBe(false);
    });
    it("opens immediately on 429 rate limit", () => {
      recordFailure("anthropic", "rate_limit");
      expect(getHealth("anthropic").state).toBe("open");
    });
    it("opens on 401 and flags auth error", () => {
      recordFailure("anthropic", "auth_error");
      expect(getHealth("anthropic").state).toBe("open");
      expect(getHealth("anthropic").errorType).toBe("auth_error");
    });
  });

  describe("recovery", () => {
    it("transitions to half-open after cooldown", () => {
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      expect(getHealth("anthropic").state).toBe("open");
      const health = getHealth("anthropic");
      health.openedAt = Date.now() - 31_000;
      expect(isAvailable("anthropic")).toBe(true);
      expect(getHealth("anthropic").state).toBe("half-open");
    });
    it("closes on success in half-open", () => {
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      const health = getHealth("anthropic");
      health.openedAt = Date.now() - 31_000;
      isAvailable("anthropic");
      recordSuccess("anthropic");
      expect(getHealth("anthropic").state).toBe("closed");
    });
    it("re-opens on failure in half-open", () => {
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      const health = getHealth("anthropic");
      health.openedAt = Date.now() - 31_000;
      isAvailable("anthropic");
      recordFailure("anthropic", "server_error");
      expect(getHealth("anthropic").state).toBe("open");
    });
  });

  describe("getHealthStatus", () => {
    it("returns healthy for closed state", () => {
      expect(getHealthStatus("anthropic").health).toBe("healthy");
    });
    it("returns down for open state", () => {
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      recordFailure("anthropic", "server_error");
      expect(getHealthStatus("anthropic").health).toBe("down");
    });
    it("returns auth_error message for auth failures", () => {
      recordFailure("anthropic", "auth_error");
      const status = getHealthStatus("anthropic");
      expect(status.health).toBe("down");
      expect(status.health_message).toContain("invalid");
    });
  });
});
