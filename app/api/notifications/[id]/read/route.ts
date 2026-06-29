import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notificationId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: notification } = await admin
    .from('notifications')
    .select('id, profile_id')
    .eq('id', notificationId)
    .single()

  if (!notification || notification.profile_id !== user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  await admin.from('notifications').update({ read: true }).eq('id', notificationId)

  return NextResponse.json({ ok: true })
}
