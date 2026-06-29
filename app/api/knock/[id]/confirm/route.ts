import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recomputeScore } from '@/lib/scoring/recompute'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: knock } = await supabase
    .from('knocks')
    .select('id, profile_id, agent_id, status, expires_at')
    .eq('id', id)
    .single()

  if (!knock) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (knock.agent_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (knock.status !== 'pending') {
    return NextResponse.json({ error: `Knock is already ${knock.status}.` }, { status: 400 })
  }
  if (new Date(knock.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Knock has expired.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('knocks')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Award +5 viewing booked signal to buyer
  await recomputeScore(knock.profile_id)

  return NextResponse.json({ ok: true })
}
