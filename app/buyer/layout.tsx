import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/scoring/recompute'
import { BuyerBottomNav } from '@/components/buyer-bottom-nav'

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

  await logActivity(user.id)

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: '#F5F0E8' }}>
      <main className="flex-1 flex flex-col pb-16">{children}</main>
      <BuyerBottomNav />
    </div>
  )
}
