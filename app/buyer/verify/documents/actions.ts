'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recomputeScore } from '@/lib/scoring/recompute'
import { sendNewLeadInAreaEmail } from '@/lib/email/send'

type UploadState = { error?: string }

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// Returns true if any agent area string appears within the buyer's free-text target area
function areaMatchesBuyerTarget(agentAreas: string[], buyerTargetArea: string): boolean {
  const haystack = buyerTargetArea.trim().toUpperCase()
  return agentAreas.some(area => {
    const needle = area.trim().toUpperCase()
    return haystack.includes(needle) || haystack.startsWith(needle)
  })
}

export async function uploadDocument(
  prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Please select a file.' }
  if (file.size > MAX_SIZE) return { error: 'File must be under 10 MB.' }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Only PDF, JPEG, and PNG files are accepted.' }
  }

  // Sanitise filename and build storage path
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/${Date.now()}-${safeName}`

  const bytes = await file.arrayBuffer()

  // Upload using the user's session so storage RLS applies
  const { error: uploadError } = await supabase.storage
    .from('verification-docs')
    .upload(path, bytes, { contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  // Append path to docs_url and mark status in_progress
  const admin = createAdminClient()
  const { data: current } = await admin
    .from('verifications')
    .select('docs_url')
    .eq('profile_id', user.id)
    .single()

  const isFirstUpload = (current?.docs_url ?? []).length === 0

  await admin
    .from('verifications')
    .update({
      docs_url: [...(current?.docs_url ?? []), path],
      status: 'in_progress',
    })
    .eq('profile_id', user.id)

  const { score } = await recomputeScore(user.id)

  // On first document upload, notify agents covering the buyer's target area
  if (isFirstUpload) {
    try {
      const [{ data: prefs }, { data: buyerProfile }, { data: allAgents }] = await Promise.all([
        admin.from('buyer_preferences').select('target_area').eq('id', user.id).maybeSingle(),
        admin.from('profiles').select('role').eq('id', user.id).single(),
        admin.from('agents').select('id, areas').eq('is_active', true),
      ])

      if (prefs?.target_area && allAgents?.length) {
        const matchingIds = allAgents
          .filter(a => areaMatchesBuyerTarget(a.areas ?? [], prefs.target_area!))
          .map(a => a.id)

        if (matchingIds.length > 0) {
          const { data: agentProfiles } = await admin
            .from('profiles')
            .select('email, full_name')
            .in('id', matchingIds)

          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
          await Promise.all(
            (agentProfiles ?? []).map(ap =>
              sendNewLeadInAreaEmail({
                agentEmail: ap.email,
                agentName: ap.full_name ?? 'there',
                buyerArea: prefs.target_area!,
                buyerRole: (buyerProfile?.role ?? 'buyer') as 'buyer' | 'renter',
                score,
                appUrl,
              })
            )
          )
        }
      }
    } catch (err) {
      console.error('[upload] new lead notification failed:', err)
    }
  }

  redirect('/buyer/verify/documents')
}
