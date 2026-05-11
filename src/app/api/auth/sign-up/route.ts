import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  enforceRateLimit,
  isStrongPassword,
  isValidEmail,
  jsonNoStore,
  normalizeEmail,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { email, password, confirmPassword } = await request.json();
  const origin = request.nextUrl.origin;
  const normalizedEmail = normalizeEmail(typeof email === 'string' ? email : '');
  const normalizedPassword = typeof password === 'string' ? password : '';
  const normalizedConfirm = typeof confirmPassword === 'string' ? confirmPassword : '';

  if (!isValidEmail(normalizedEmail)) {
    return jsonNoStore({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (!isStrongPassword(normalizedPassword)) {
    return jsonNoStore(
      { error: 'Use at least 8 characters with at least one letter and one number.' },
      { status: 400 }
    );
  }

  if (normalizedPassword !== normalizedConfirm) {
    return jsonNoStore({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const limitResponse = enforceRateLimit(request, {
    action: 'sign-up',
    limit: 3,
    windowMs: 10 * 60_000,
    email: normalizedEmail,
  });

  if (limitResponse) {
    return limitResponse;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: normalizedPassword,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return jsonNoStore({ error: 'Could not create your account right now.' }, { status: 400 });
  }

  return jsonNoStore({
    ok: true,
    requiresEmailConfirmation: !data.session,
    message: data.session
      ? 'Account created. Taking you to your library...'
      : 'Check your email to confirm your account.',
  });
}
