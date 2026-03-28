// src/lib/serverAuth.ts
// Server-side auth helper: verifies a Supabase access token and returns the user.
// Used by server actions to authenticate requests without @supabase/ssr.

import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Verify a Supabase JWT access token server-side.
 * Returns the authenticated User or null if invalid/expired.
 */
export async function verifyAccessToken(accessToken: string): Promise<User | null> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data: { user }, error } = await client.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
}
