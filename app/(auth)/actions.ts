'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = { error?: string }

export async function login(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role

  redirect(role === 'agent' ? '/agent/dashboard' : '/buyer/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signUp(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const role = formData.get('role') as 'agent' | 'buyer' | 'renter'
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, full_name: fullName } },
  })

  if (error) return { error: error.message }

  const userId = data.user?.id
  if (!userId) return { error: 'Signup failed — please try again.' }

  if (role === 'agent') {
    const agencyName = formData.get('agency_name') as string
    const areasRaw = formData.get('areas') as string
    const areas = areasRaw.split(',').map(a => a.trim()).filter(Boolean)

    const { error: agentError } = await admin
      .from('agents')
      .insert({ id: userId, agency_name: agencyName, areas })

    if (agentError) return { error: agentError.message }
  } else {
    const { error: prefError } = await admin
      .from('buyer_preferences')
      .insert({
        id: userId,
        target_area: formData.get('target_area') as string,
        budget_range: formData.get('budget_range') as string,
        move_timeframe: formData.get('move_timeframe') as '0-3' | '3-6' | '6+',
      })

    if (prefError) return { error: prefError.message }

    await admin.from('verifications').insert({ profile_id: userId, status: 'pending' })
    await admin.from('intent_scores').insert({ profile_id: userId, score: 0, signals: {} })
  }

  // Email confirmation is enabled: tell the user to check their inbox
  if (!data.session) {
    redirect('/signup/check-email')
  }

  redirect(role === 'agent' ? '/agent/dashboard' : '/buyer/dashboard')
}
