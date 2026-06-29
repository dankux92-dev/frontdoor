'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendKnockAlertEmail } from '@/lib/email/send'

function outwardCode(postcode: string) {
  return postcode.trim().toUpperCase().split(/\s+/)[0]
}

export async function recordPropertyAction(
  propertyId: string,
  action: 'archived' | 'saved' | 'knocked'
): Promise<{ knockId?: string; error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Always upsert the UI action (removes property from swipe deck)
  await admin
    .from('buyer_property_actions')
    .upsert(
      { profile_id: user.id, property_id: propertyId, action },
      { onConflict: 'profile_id,property_id' }
    )

  if (action !== 'knocked') return null

  // For knock: find the property, match an agent, create a knock record
  const { data: property } = await admin
    .from('properties')
    .select('address, postcode')
    .eq('id', propertyId)
    .single()

  if (!property) return { error: 'Property not found.' }

  const outward = outwardCode(property.postcode)

  const { data: agents } = await admin
    .from('agents')
    .select('id, areas')
    .eq('is_active', true)

  const matchingAgent = agents?.find(a =>
    a.areas?.some((area: string) =>
      outward.startsWith(area.trim().toUpperCase())
    )
  )

  if (!matchingAgent) {
    return { error: `No agent covers the ${outward} area yet. We're expanding — check back soon.` }
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const { data: knock, error: knockError } = await admin
    .from('knocks')
    .insert({
      profile_id: user.id,
      property_address: property.address,
      property_postcode: property.postcode,
      property_id: propertyId,
      agent_id: matchingAgent.id,
      status: 'pending',
      knocked_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (knockError || !knock) {
    return { error: 'Failed to create knock. Please try again.' }
  }

  try {
    const [{ data: agentProfile }, { data: buyerProfile }, { data: buyerScore }] =
      await Promise.all([
        admin.from('profiles').select('email, full_name').eq('id', matchingAgent.id).single(),
        admin.from('profiles').select('role').eq('id', user.id).single(),
        admin.from('intent_scores').select('score').eq('profile_id', user.id).maybeSingle(),
      ])

    if (agentProfile?.email) {
      await sendKnockAlertEmail({
        agentEmail: agentProfile.email,
        agentName: agentProfile.full_name ?? 'there',
        buyerRole: (buyerProfile?.role ?? 'buyer') as 'buyer' | 'renter',
        buyerScore: buyerScore?.score ?? 0,
        propertyAddress: property.address,
        propertyPostcode: property.postcode,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
      })
    }
  } catch (err) {
    console.error('[swipe-knock] alert email failed:', err)
  }

  return { knockId: knock.id }
}

export async function knockPropertyFromSaved(propertyId: string): Promise<void> {
  const result = await recordPropertyAction(propertyId, 'knocked')
  if (result?.knockId) {
    redirect(`/buyer/knock/${result.knockId}`)
  } else {
    redirect(`/buyer/saved?error=${encodeURIComponent(result?.error ?? 'Failed to create knock')}`)
  }
}

export async function unarchiveProperty(propertyId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  await admin
    .from('buyer_property_actions')
    .delete()
    .eq('profile_id', user.id)
    .eq('property_id', propertyId)
}
