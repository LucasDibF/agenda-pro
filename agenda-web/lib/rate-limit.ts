type HeaderReader = { get(name: string): string | null };

type Bucket = {
  count: number;
  windowStart: number;
  windowMs: number;
  violations: number;
  blockedUntil: number;
  /** A janela atual já estourou o limite. Impede zerar a penalidade no reset seguinte. */
  exceeded: boolean;
};

type ScopeWindow = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const scopes = new Map<string, ScopeWindow>();

/** Teto de chaves nesta instância. Acima disso a decisão é negar, sem guardar a chave nova. */
export const RATE_LIMIT_MAX_BUCKETS = 2_000;
const MAX_BLOCK_MS = 15 * 60_000;
const MAX_VIOLATIONS = 8;
const MAX_KEY_LENGTH = 180;

const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  /** Agrupa um teto de todas as chaves desta instância (flood com vários IPs). */
  scope?: string;
  globalLimit?: number;
  /** Relógio injetável. Produção usa Date.now(). */
  now?: number;
};

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function resetRateLimits(): void {
  buckets.clear();
  scopes.clear();
}

function retryAfterSec(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

function blocked(ms: number): RateLimitResult {
  return { ok: false, retryAfterSec: retryAfterSec(ms) };
}

function normalizeKey(key: string): string {
  const trimmed = key.trim().slice(0, MAX_KEY_LENGTH);
  return trimmed || "invalid";
}

function isIp(value: string): boolean {
  if (IPV4.test(value)) return true;
  if (!value.includes(":") || value.length > 45) return false;
  return /^[0-9a-f:.]+$/i.test(value);
}

function firstValidIp(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.trim() ?? "";
  return isIp(first) ? first : null;
}

/** Só confia em um único IP. Lista separada por vírgula pode ter sido prefixada pelo cliente. */
function singleIp(header: string | null): string | null {
  if (!header) return null;
  const value = header.trim();
  if (!value || value.includes(",")) return null;
  return isIp(value) ? value : null;
}

/**
 * IP do cliente sem aceitar identidade forjada.
 * `x-vercel-forwarded-for` é definido pela plataforma. `x-forwarded-for` com vários
 * saltos é ignorado: cada valor inventado viraria um balde novo e o limite não existiria.
 * Sem IP confiável, todo mundo cai em "unknown" e divide o mesmo limite.
 */
export function readClientIp(headers: HeaderReader): string {
  return (
    firstValidIp(headers.get("x-vercel-forwarded-for")) ??
    singleIp(headers.get("x-real-ip")) ??
    singleIp(headers.get("x-forwarded-for")) ??
    "unknown"
  );
}

export function getClientIp(request: Request): string {
  return readClientIp(request.headers);
}

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    const idle = now >= bucket.blockedUntil && now >= bucket.windowStart + bucket.windowMs;
    if (idle) buckets.delete(key);
  }
}

function takeScope(
  scope: string,
  globalLimit: number,
  windowMs: number,
  now: number,
): { ok: true; commit: () => void } | { ok: false; retryAfterSec: number } {
  const current = scopes.get(scope);
  if (!current || now >= current.resetAt) {
    return {
      ok: true,
      commit: () => scopes.set(scope, { count: 1, resetAt: now + windowMs }),
    };
  }
  if (current.count >= globalLimit) {
    return { ok: false, retryAfterSec: retryAfterSec(current.resetAt - now) };
  }
  return {
    ok: true,
    commit: () => {
      current.count += 1;
    },
  };
}

/**
 * Limite em memória por instância, com bloqueio que aumenta se o mesmo
 * cliente estoura a janela de novo. Não zera a cada minuto para quem insiste.
 */
export function checkRateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const limit = Math.max(1, options.limit ?? 10);
  const windowMs = Math.max(1_000, options.windowMs ?? 60_000);
  const now = options.now ?? Date.now();

  const scopeGate =
    options.scope && options.globalLimit && options.globalLimit > 0
      ? takeScope(options.scope, options.globalLimit, windowMs, now)
      : null;
  if (scopeGate && !scopeGate.ok) return scopeGate;

  const normalized = normalizeKey(key);
  let bucket = buckets.get(normalized);

  if (!bucket && buckets.size >= RATE_LIMIT_MAX_BUCKETS) {
    prune(now);
    if (buckets.size >= RATE_LIMIT_MAX_BUCKETS) return blocked(windowMs);
  }

  if (!bucket) {
    bucket = {
      count: 0,
      windowStart: now,
      windowMs,
      violations: 0,
      blockedUntil: 0,
      exceeded: false,
    };
    buckets.set(normalized, bucket);
  }

  if (now < bucket.blockedUntil) {
    return blocked(bucket.blockedUntil - now);
  }

  if (now >= bucket.windowStart + bucket.windowMs) {
    if (!bucket.exceeded && bucket.violations > 0) bucket.violations -= 1;
    bucket.exceeded = false;
    bucket.count = 0;
    bucket.windowStart = now;
    bucket.windowMs = windowMs;
  }

  if (bucket.count >= limit) {
    bucket.violations = Math.min(bucket.violations + 1, MAX_VIOLATIONS);
    bucket.exceeded = true;
    const penalty = Math.min(windowMs * 2 ** bucket.violations, MAX_BLOCK_MS);
    bucket.blockedUntil = now + penalty;
    bucket.count = 0;
    bucket.windowStart = bucket.blockedUntil;
    return blocked(penalty);
  }

  bucket.count += 1;
  scopeGate?.commit();
  return { ok: true };
}
