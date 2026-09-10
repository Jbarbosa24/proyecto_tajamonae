import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options) => {
          try {
            const resp = await fetch(url, options)
            return resp
          } catch (err: any) {
            console.warn('Network Error silently caught for Supabase:', err.message)
            // Return a mocked 502 response so the Supabase client handles it cleanly without massive stacktraces.
            return new Response(JSON.stringify({ error: 'fetch_failed', message: err.message }), {
              status: 502,
              headers: { 'Content-Type': 'application/json' },
            })
          }
        }
      }
    }
  )
}
