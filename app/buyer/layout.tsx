import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/scoring/recompute'

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'agent') redirect('/agent/dashboard')

  // Log today as an active day for the activity streak
  await logActivity(user.id)

  return <>{children}</>
}
