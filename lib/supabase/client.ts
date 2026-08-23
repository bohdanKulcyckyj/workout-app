import { createBrowserClient } from "@supabase/ssr";

// Null when Supabase is not configured -- the app then runs unauthenticated
// on localStorage instead of crashing on a missing URL.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
