import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit, isValidEmail, jsonNoStore, normalizeEmail } from '@/lib/auth';

const GENERIC_RESPONSE = {
  ok: true,
  message: 'If that email exists, a reset link is on its way.',
};

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  const origin = request.nextUrl.origin;
  const normalizedEmail = normalizeEmail(typeof email === 'string' ? email : '');

  if (!isValidEmail(normalizedEmail)) {
    return jsonNoStore(GENERIC_RESPONSE);
  }

  const limitResponse = enforceRateLimit(request, {
    action: 'forgot-password',
    limit: 3,
    windowMs: 15 * 60_000,
    email: normalizedEmail,
  });

  if (limitResponse) {
    return limitResponse;
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return jsonNoStore(GENERIC_RESPONSE);
}
