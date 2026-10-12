import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  RATE_LIMIT_MAX_BUCKETS,
  checkRateLimit,
  readClientIp,
  resetRateLimits,
} from "./rate-limit.ts";

function headersOf(values: Record<string, string>): { get(name: string): string | null } {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("readClientIp", () => {
  it("prefere o IP da plataforma e ignora X-Forwarded-For forjado", () => {
    const ip = readClientIp(
      headersOf({
        "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-forwarded-for": "198.51.100.4, 203.0.113.10",
      }),
    );
    assert.equal(ip, "203.0.113.10");
  });

  it("nao cria um IP novo para cada lista forjada", () => {
    const first = readClientIp(headersOf({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }));
    const second = readClientIp(headersOf({ "x-forwarded-for": "8.8.8.8, 9.9.9.9" }));
    assert.equal(first, "unknown");
    assert.equal(second, "unknown");
  });

  it("aceita um unico x-forwarded-for quando a plataforma nao enviou o dela", () => {
    assert.equal(readClientIp(headersOf({ "x-forwarded-for": "192.0.2.15" })), "192.0.2.15");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("permite ate o limite e bloqueia a requisicao seguinte", () => {
    const opts = { limit: 2, windowMs: 60_000, now: 1_000 };
    assert.equal(checkRateLimit("ip", opts).ok, true);
    assert.equal(checkRateLimit("ip", opts).ok, true);
    const blocked = checkRateLimit("ip", opts);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.retryAfterSec, 120);
  });

  it("aumenta o bloqueio se o mesmo cliente estoura de novo", () => {
    const first = { limit: 1, windowMs: 1_000, now: 0 };
    assert.equal(checkRateLimit("ip", first).ok, true);
    const blocked = checkRateLimit("ip", first);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.retryAfterSec, 2);

    const after = { limit: 1, windowMs: 1_000, now: 2_000 };
    assert.equal(checkRateLimit("ip", after).ok, true);
    const again = checkRateLimit("ip", after);
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.retryAfterSec, 4);
  });

  it("identidades forjadas dividem o mesmo balde", () => {
    const key = `notify:${readClientIp(headersOf({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))}`;
    const other = `notify:${readClientIp(headersOf({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" }))}`;
    assert.equal(key, other);
    assert.equal(checkRateLimit(key, { limit: 1, windowMs: 60_000, now: 0 }).ok, true);
    assert.equal(checkRateLimit(other, { limit: 1, windowMs: 60_000, now: 0 }).ok, false);
  });

  it("aplica teto global entre chaves diferentes", () => {
    const opts = { limit: 10, windowMs: 60_000, scope: "booking", globalLimit: 2, now: 0 };
    assert.equal(checkRateLimit("a", opts).ok, true);
    assert.equal(checkRateLimit("b", opts).ok, true);
    assert.equal(checkRateLimit("c", opts).ok, false);
  });

  it("nao deixa chave nova passar quando o mapa esta cheio", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_BUCKETS; i += 1) {
      const result = checkRateLimit(`k${i}`, { limit: 5, windowMs: 60_000, now: 0 });
      assert.equal(result.ok, true);
    }
    assert.equal(checkRateLimit("overflow", { limit: 5, windowMs: 60_000, now: 0 }).ok, false);
    assert.equal(checkRateLimit("k0", { limit: 5, windowMs: 60_000, now: 0 }).ok, true);
  });

  it("descarta baldes vencidos e volta a aceitar chave nova", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_BUCKETS; i += 1) {
      checkRateLimit(`old${i}`, { limit: 5, windowMs: 1_000, now: 0 });
    }
    const fresh = checkRateLimit("fresh", { limit: 5, windowMs: 1_000, now: 1_000 });
    assert.equal(fresh.ok, true);
  });
});
