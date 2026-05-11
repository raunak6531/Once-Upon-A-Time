import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit, isValidEmail, jsonNoStore, normalizeEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const normalizedEmail = normalizeEmail(typeof email === 'string' ? email : '');
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (!isValidEmail(normalizedEmail) || normalizedPassword.length === 0) {
    return jsonNoStore({ error: 'Please enter a valid email and password.' }, { status: 400 });
  }

  const limitResponse = enforceRateLimit(request, {
    action: 'sign-in',
    limit: 5,
    windowMs: 60_000,
    email: normalizedEmail,
  });

  if (limitResponse) {
    return limitResponse;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    return jsonNoStore({ error: 'Invalid email or password.' }, { status: 401 });
  }

  return jsonNoStore({ ok: true });
}
