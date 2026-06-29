import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify caller is an active agent
  const { data: agent } = await admin
    .from('agents')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (!agent?.is_active) {
    return NextResponse.json({ error: 'Agent account not active.' }, { status: 403 })
  }

  // Verify the target is a buyer/renter
  const { data: buyerProfile } = await admin
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', profileId)
    .in('role', ['buyer', 'renter'])
    .single()

  if (!buyerProfile) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  }

  // Idempotent: don't error if already unlocked
  const { data: existing } = await admin
    .from('leads')
    .select('id')
    .eq('profile_id', profileId)
    .eq('agent_id', user.id)
    .maybeSingle()

  if (!existing) {
    const { data: prefs } = await admin
      .from('buyer_preferences')
      .select('target_area, budget_range, move_timeframe')
      .eq('id', profileId)
      .maybeSingle()

    await admin.from('leads').insert({
      profile_id: profileId,
      agent_id: user.id,
      unlocked_at: new Date().toISOString(),
      price_range: prefs?.budget_range ?? null,
      move_date: prefs?.move_timeframe ?? null,
      postcode_area: prefs?.target_area ?? null,
    })
  }

  return NextResponse.json({
    full_name: buyerProfile.full_name,
    email: buyerProfile.email,
  })
}
