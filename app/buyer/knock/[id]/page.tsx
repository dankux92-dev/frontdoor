import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KnockStatus } from '@/components/knock-status'

export default async function KnockPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: knock } = await supabase
    .from('knocks')
    .select('id, status, property_address, property_postcode, expires_at')
    .eq('id', id)
    .eq('profile_id', user!.id)
    .single()

  if (!knock) notFound()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <KnockStatus knock={knock} />
      </div>
    </div>
  )
}
