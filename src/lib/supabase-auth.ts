import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Auth-only Supabase client, keyed by the *anon* key. Used for end-user auth
// operations: signInWithPassword, resetPasswordForEmail, verifyOtp, updateUser.
//
// Unlike lib/supabase.ts (service role, cached singleton), this returns a FRESH
// client every call on purpose: verifyOtp / signIn establish an in-memory
// session on the instance, and we don't want one request's session bleeding
// into another. persistSession is off so nothing is written to disk/cookies.

export function supabaseAuth(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
