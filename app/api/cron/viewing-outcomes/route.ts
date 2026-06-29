import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendViewingOutcomeRequestEmail } from '@/lib/email/send'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Knocks confirmed 5–10 days ago (window prevents re-sending after the initial send)
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const tenDaysAgo  = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

  const { data: knocks, error } = await admin
    .from('knocks')
    .select('id, profile_id, agent_id, property_address, property_postcode')
    .eq('status', 'confirmed')
    .lte('confirmed_at', fiveDaysAgo)
    .gte('confirmed_at', tenDaysAgo)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!knocks?.length) return NextResponse.json({ notified: 0 })

  const knockIds = knocks.map(k => k.id)

  // Skip knocks that already have a viewing or an outcome notification
  const [{ data: existingViewings }, { data: existingNotifs }] = await Promise.all([
    admin.from('viewings').select('knock_id').in('knock_id', knockIds),
    admin.from('notifications')
      .select('knock_id')
      .in('knock_id', knockIds)
      .eq('type', 'viewing_outcome_request'),
  ])

  const hasViewing = new Set(existingViewings?.map(v => v.knock_id) ?? [])
  const hasNotif   = new Set(existingNotifs?.map(n => n.knock_id) ?? [])

  const eligible = knocks.filter(k => !hasViewing.has(k.id) && !hasNotif.has(k.id))

  if (!eligible.length) return NextResponse.json({ notified: 0 })

  // In-app notifications
  const notifications = eligible.flatMap(knock => [
    {
      profile_id: knock.profile_id,
      type: 'viewing_outcome_request',
      knock_id: knock.id,
      message: `How did the viewing go at ${knock.property_address}? Please let us know the outcome.`,
    },
    {
      profile_id: knock.agent_id,
      type: 'viewing_outcome_request',
      knock_id: knock.id,
      message: `Please confirm the viewing outcome for ${knock.property_address} (${knock.property_postcode}).`,
    },
  ])

  const { error: insertError } = await admin.from('notifications').insert(notifications)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Fetch emails for all unique profile IDs involved
  const profileIds = [...new Set(eligible.flatMap(k => [k.profile_id, k.agent_id]))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .in('id', profileIds)

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Send emails (failures are caught inside each send function)
  await Promise.all(
    eligible.flatMap(knock => {
      const buyer = profileMap.get(knock.profile_id)
      const agent = profileMap.get(knock.agent_id)
      return [
        buyer && sendViewingOutcomeRequestEmail({
          recipientEmail: buyer.email,
          recipientName: buyer.full_name ?? 'there',
          propertyAddress: knock.property_address,
          role: buyer.role as 'buyer' | 'renter',
          appUrl,
        }),
        agent && sendViewingOutcomeRequestEmail({
          recipientEmail: agent.email,
          recipientName: agent.full_name ?? 'there',
          propertyAddress: knock.property_address,
          role: 'agent',
          appUrl,
        }),
      ].filter(Boolean)
    })
  )

  return NextResponse.json({ notified: eligible.length })
}
