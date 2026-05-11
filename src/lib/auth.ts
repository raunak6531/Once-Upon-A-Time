import { NextRequest, NextResponse } from 'next/server';

type RateLimitRule = {
  action: string;
  limit: number;
  windowMs: number;
  email?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

declare global {
  var __ouatAuthRateLimits: Map<string, RateLimitBucket> | undefined;
}

const rateLimits = globalThis.__ouatAuthRateLimits ?? new Map<string, RateLimitBucket>();

if (!globalThis.__ouatAuthRateLimits) {
  globalThis.__ouatAuthRateLimits = rateLimits;
}

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/i.test(password) &&
    /\d/.test(password)
  );
}

export function sanitizeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/library';
  }

  try {
    const decoded = decodeURIComponent(next);
    if (decoded.includes('\r') || decoded.includes('\n')) {
      return '/library';
    }
  } catch {
    return '/library';
  }

  return next;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

export function enforceRateLimit(request: NextRequest, rule: RateLimitRule) {
  const ip = getClientIp(request);
  const identity = rule.email ? normalizeEmail(rule.email) : 'anonymous';
  const key = `${rule.action}:${ip}:${identity}`;
  const now = Date.now();
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }

  if (current.count >= rule.limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return jsonNoStore(
      { error: 'Too many attempts. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  current.count += 1;
  rateLimits.set(key, current);
  return null;
}
