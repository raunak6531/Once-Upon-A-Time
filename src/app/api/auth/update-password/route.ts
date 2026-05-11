import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit, isStrongPassword, jsonNoStore } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password, confirmPassword } = await request.json();
  const nextPassword = typeof password === 'string' ? password : '';
  const nextConfirm = typeof confirmPassword === 'string' ? confirmPassword : '';

  if (!isStrongPassword(nextPassword)) {
    return jsonNoStore(
      { error: 'Use at least 8 characters with at least one letter and one number.' },
      { status: 400 }
    );
  }

  if (nextPassword !== nextConfirm) {
    return jsonNoStore({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const limitResponse = enforceRateLimit(request, {
    action: 'update-password',
    limit: 5,
    windowMs: 15 * 60_000,
  });

  if (limitResponse) {
    return limitResponse;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonNoStore({ error: 'Your reset session is no longer valid. Request a new link.' }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({
    password: nextPassword,
  });

  if (error) {
    return jsonNoStore({ error: 'Could not update your password right now.' }, { status: 400 });
  }

  return jsonNoStore({ ok: true, message: 'Password updated. You can sign in now.' });
}
