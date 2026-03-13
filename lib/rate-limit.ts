/**
 * Simple in-memory rate limiter keyed by IP address.
 * Limits are per-route and reset on a sliding window.
 *
 * NOTE: In-memory only — resets on server restart and is per-instance
 * (fine for MVP / single-server deployments like Vercel serverless).
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const STALE_THRESHOLD = 10 * 60 * 1000;

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > STALE_THRESHOLD) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max tokens (requests) in the bucket */
  maxTokens: number;
  /** How many tokens are refilled per interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillInterval: number;
}

/** Default: 10 requests per minute */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxTokens: 10,
  refillRate: 10,
  refillInterval: 60_000,
};

/** Stricter limit for AI generation endpoints: 5 requests per minute */
export const AI_RATE_LIMIT: RateLimitConfig = {
  maxTokens: 5,
  refillRate: 5,
  refillInterval: 60_000,
};

/**
 * Check if a request is allowed under the rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= config.refillInterval) {
    const refills = Math.floor(elapsed / config.refillInterval);
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refills * config.refillRate);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  const msUntilRefill = config.refillInterval - (now - bucket.lastRefill);
  return { allowed: false, retryAfterMs: msUntilRefill };
}

/**
 * Extract a rate-limit key from a Next.js request (IP + route prefix).
 */
export function getRateLimitKey(request: Request, route: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${route}:${ip}`;
}
