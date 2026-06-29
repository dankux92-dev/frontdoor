import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Bypasses RLS. Only use in server-side admin actions (e.g. setting is_active on agents).
// Never expose this client to the browser.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
