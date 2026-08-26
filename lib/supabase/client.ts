import { createBrowserClient } from "@supabase/ssr";

// Supabase is the only backend -- missing env vars are a misconfiguration,
// not a mode. Fail loudly here rather than rendering a broken app.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill them in (see README)."
    );
  }
  return createBrowserClient(url, key);
}
