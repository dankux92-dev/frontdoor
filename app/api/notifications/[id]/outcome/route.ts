import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recomputeScore } from '@/lib/scoring/recompute'

const VALID_OUTCOMES = ['booked', 'attended', 'no_action'] as const
type Outcome = typeof VALID_OUTCOMES[number]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notificationId } = await params

  const body = await request.json().catch(() => ({}))
  const outcome = body.outcome as string
  if (!VALID_OUTCOMES.includes(outcome as Outcome)) {
    return NextResponse.json({ error: 'Invalid outcome.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: notification } = await admin
    .from('notifications')
    .select('id, profile_id, type, knock_id, read')
    .eq('id', notificationId)
    .single()

  if (!notification || notification.profile_id !== user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  if (notification.type !== 'viewing_outcome_request') {
    return NextResponse.json({ error: 'Wrong notification type.' }, { status: 400 })
  }
  if (!notification.knock_id) {
    return NextResponse.json({ error: 'No knock associated.' }, { status: 400 })
  }

  const { data: knock } = await admin
    .from('knocks')
    .select('id, profile_id, agent_id')
    .eq('id', notification.knock_id)
    .single()

  if (!knock) return NextResponse.json({ error: 'Knock not found.' }, { status: 404 })

  // Check if a viewing already exists (other party already responded)
  const { data: existing } = await admin
    .from('viewings')
    .select('id, outcome')
    .eq('knock_id', notification.knock_id)
    .maybeSingle()

  if (!existing) {
    // First response — record the viewing
    await admin.from('viewings').insert({
      knock_id: notification.knock_id,
      outcome: outcome as Outcome,
      outcome_at: new Date().toISOString(),
    })
  } else if (existing.outcome !== outcome) {
    // Second response with a different outcome — flag for manual review
    await admin
      .from('knocks')
      .update({ needs_review: true })
      .eq('id', notification.knock_id)
  }
  // If same outcome as already recorded, nothing extra to do

  // Mark this notification as read
  await admin
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  // Recompute buyer's intent score
  await recomputeScore(knock.profile_id)

  return NextResponse.json({ ok: true })
}
