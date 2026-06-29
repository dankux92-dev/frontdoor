'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendKnockAlertEmail } from '@/lib/email/send'

export type KnockState = { error?: string }

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

function outwardCode(postcode: string) {
  return postcode.trim().toUpperCase().split(/\s+/)[0]
}

export async function createKnock(
  prevState: KnockState,
  formData: FormData
): Promise<KnockState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const propertyAddress = (formData.get('property_address') as string)?.trim()
  const propertyPostcode = (formData.get('property_postcode') as string)?.trim().toUpperCase()

  if (!propertyAddress || !propertyPostcode) {
    return { error: 'Please fill in both fields.' }
  }

  if (!UK_POSTCODE_RE.test(propertyPostcode)) {
    return { error: 'Please enter a valid UK postcode (e.g. SW1A 1AA).' }
  }

  const outward = outwardCode(propertyPostcode)

  const admin = createAdminClient()
  const { data: agents } = await admin
    .from('agents')
    .select('id, areas')
    .eq('is_active', true)

  const matchingAgent = agents?.find(a =>
    a.areas?.some((area: string) =>
      outward.toUpperCase().startsWith(area.trim().toUpperCase())
    )
  )

  if (!matchingAgent) {
    return {
      error: `No agent covers the ${outward} area yet. We're expanding — check back soon.`,
    }
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const { data: knock, error } = await admin
    .from('knocks')
    .insert({
      profile_id: user.id,
      property_address: propertyAddress,
      property_postcode: propertyPostcode,
      agent_id: matchingAgent.id,
      status: 'pending',
      knocked_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (error || !knock) {
    return { error: 'Failed to create knock. Please try again.' }
  }

  // Send knock alert email to the agent (fire before redirect)
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
        propertyAddress,
        propertyPostcode,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
      })
    }
  } catch (err) {
    console.error('[knock] alert email failed:', err)
  }

  redirect(`/buyer/knock/${knock.id}`)
}
