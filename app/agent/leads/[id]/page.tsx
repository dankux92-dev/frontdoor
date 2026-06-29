import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TIMEFRAME_LABELS: Record<string, string> = {
  '0-3': 'Within 3 months',
  '3-6': '3 – 6 months',
  '6+': '6+ months',
}

const VERIFICATION_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Not started', color: 'text-gray-400' },
  in_progress: { label: 'Documents uploaded — under review', color: 'text-amber-600' },
  verified:    { label: 'Fully verified', color: 'text-green-600' },
  failed:      { label: 'Verification failed', color: 'text-red-600' },
}

function fileLabel(path: string) {
  return path.split('/').pop()?.replace(/^\d+-/, '') ?? path
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: profileId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Gate: agent must have unlocked this lead
  const { data: lead } = await admin
    .from('leads')
    .select('unlocked_at')
    .eq('profile_id', profileId)
    .eq('agent_id', user!.id)
    .maybeSingle()

  if (!lead) notFound()

  const [
    { data: profile },
    { data: prefs },
    { data: scoreData },
    { data: verification },
  ] = await Promise.all([
    admin.from('profiles').select('role, email, full_name').eq('id', profileId).single(),
    admin.from('buyer_preferences').select('*').eq('id', profileId).maybeSingle(),
    admin.from('intent_scores').select('score, computed_at').eq('profile_id', profileId).maybeSingle(),
    admin.from('verifications').select('status, income_verified, id_check_result, docs_url').eq('profile_id', profileId).maybeSingle(),
  ])

  if (!profile) notFound()

  const score = scoreData?.score ?? 0
  const pct = Math.round((score / 100) * 100)
  const verStatus = VERIFICATION_STATUS[verification?.status ?? 'pending']
  const docs = verification?.docs_url ?? []

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        <div>
          <Link
            href="/agent/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back to dashboard
          </Link>
          <div className="mt-2 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.full_name ?? 'No name provided'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{profile.role}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{score}</p>
              <p className="text-xs text-gray-400">Intent score</p>
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <p>
              <span className="text-gray-400 w-16 inline-block">Name</span>
              <span className="font-medium text-gray-900">{profile.full_name ?? '—'}</span>
            </p>
            <p>
              <span className="text-gray-400 w-16 inline-block">Email</span>
              <a
                href={`mailto:${profile.email}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {profile.email}
              </a>
            </p>
            <p className="text-xs text-gray-400 pt-1">
              Unlocked on {new Date(lead.unlocked_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>

        {/* Search preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Search preferences</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5 text-gray-600">
            <p>
              <span className="text-gray-400 w-24 inline-block">Area</span>
              {prefs?.target_area ?? '—'}
            </p>
            <p>
              <span className="text-gray-400 w-24 inline-block">Budget</span>
              {prefs?.budget_range ?? '—'}
            </p>
            <p>
              <span className="text-gray-400 w-24 inline-block">Timeframe</span>
              {prefs?.move_timeframe ? TIMEFRAME_LABELS[prefs.move_timeframe] : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Verification */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Identity check (ID)</span>
                {verification?.id_check_result === 'passed' ? (
                  <span className="text-green-600 font-medium">✓ Passed</span>
                ) : (
                  <span className="text-gray-400">Not completed</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Income / proof of funds</span>
                {verification?.income_verified ? (
                  <span className="text-green-600 font-medium">✓ Verified</span>
                ) : docs.length > 0 ? (
                  <span className="text-amber-600 font-medium">⏳ Pending review</span>
                ) : (
                  <span className="text-gray-400">Not uploaded</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Overall status</span>
                <span className={`font-medium ${verStatus.color}`}>{verStatus.label}</span>
              </div>
            </div>

            {docs.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Uploaded documents
                </p>
                <ul className="space-y-1">
                  {docs.map(path => (
                    <li key={path} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-gray-300">•</span>
                      {fileLabel(path)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
