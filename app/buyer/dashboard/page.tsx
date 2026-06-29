import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogoutButton } from '@/components/logout-button'
import { NotificationsBell } from '@/components/notifications-bell'
import { recomputeScore } from '@/lib/scoring/recompute'
import { MAX_POINTS, TOTAL_MAX } from '@/lib/scoring/calculate'
import type { ScoreSignals, PointsBreakdown } from '@/lib/scoring/calculate'

const TIMEFRAME_LABELS: Record<string, string> = {
  '0-3': 'Within 3 months',
  '3-6': '3 – 6 months',
  '6+': '6+ months',
}

// ─── Signal row ──────────────────────────────────────────────────────────────

function SignalRow({
  status,
  label,
  sublabel,
  points,
  maxPoints,
  action,
}: {
  status: 'earned' | 'pending' | 'missing'
  label: string
  sublabel?: string
  points: number
  maxPoints: number
  action?: { href: string; label: string }
}) {
  const icon =
    status === 'earned' ? '✅' : status === 'pending' ? '⏳' : '⬜'

  const pointsLabel =
    status === 'earned'
      ? `+${points} pts`
      : status === 'pending'
      ? `+${maxPoints} pts (pending)`
      : `+${maxPoints} pts`

  const pointsColor =
    status === 'earned'
      ? 'text-green-700 font-semibold'
      : status === 'pending'
      ? 'text-amber-600 font-medium'
      : 'text-gray-400'

  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-base mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
          {action && status === 'missing' && (
            <Link
              href={action.href}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-0.5 inline-block"
            >
              {action.label} →
            </Link>
          )}
        </div>
      </div>
      <span className={`text-sm shrink-0 ${pointsColor}`}>{pointsLabel}</span>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function BuyerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Recompute score on every dashboard load (keeps it fresh)
  const { score, signals, breakdown } = await recomputeScore(user!.id)

  const [{ data: profile }, { data: prefs }, { data: notifs }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user!.id).single(),
    supabase.from('buyer_preferences').select('*').eq('id', user!.id).single(),
    supabase
      .from('notifications')
      .select('id, type, knock_id, message, read, created_at')
      .eq('profile_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const pct = Math.round((score / 100) * 100)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile?.full_name ?? 'Welcome'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {profile?.role === 'renter' ? 'Renter' : 'Buyer'} account
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell notifications={notifs ?? []} />
            <LogoutButton />
          </div>
        </div>

        {/* Score card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-600 font-medium">
              Your intent score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-gray-900">{score}</span>
              <span className="text-gray-400 text-lg mb-1">/ 100</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              Maximum achievable: {TOTAL_MAX} pts · Agents can see this score on your profile.
            </p>
          </CardContent>
        </Card>

        {/* Signal checklist */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">What earns points</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">

            {/* Section: Permanent */}
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-4 mb-1">
              Permanent — earned once, never lost
            </p>
            <div className="divide-y divide-gray-100">
              <SignalRow
                status={signals.id_verified ? 'earned' : 'missing'}
                label="ID verification"
                sublabel="Government-issued photo ID check"
                points={breakdown.id_verification}
                maxPoints={MAX_POINTS.id_verification}
                action={{ href: '/buyer/verify/id', label: 'Start ID check' }}
              />

              <SignalRow
                status={
                  signals.documents_verified
                    ? 'earned'
                    : signals.documents_uploaded
                    ? 'pending'
                    : 'missing'
                }
                label={
                  signals.documents_verified
                    ? 'Documents verified'
                    : signals.documents_uploaded
                    ? 'Documents uploaded'
                    : 'Proof of funds / MIP / employment contract'
                }
                sublabel={
                  signals.documents_uploaded && !signals.documents_verified
                    ? 'Under review — we\'ll confirm shortly'
                    : undefined
                }
                points={breakdown.documents}
                maxPoints={MAX_POINTS.documents}
                action={{ href: '/buyer/verify/documents', label: 'Upload a document' }}
              />

              <SignalRow
                status={signals.move_timeframe ? 'earned' : 'missing'}
                label={
                  signals.move_timeframe
                    ? `Move timeframe: ${TIMEFRAME_LABELS[signals.move_timeframe]}`
                    : 'Move timeframe'
                }
                sublabel={signals.move_timeframe ? undefined : 'Set when you signed up'}
                points={breakdown.move_timeframe}
                maxPoints={MAX_POINTS.move_timeframe}
              />
            </div>

            {/* Section: Viewings */}
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-5 mb-1">
              Viewings — permanent once confirmed
            </p>
            <div className="divide-y divide-gray-100">
              <SignalRow
                status={
                  signals.viewing_status === 'attended' || signals.viewing_status === 'booked'
                    ? 'earned'
                    : 'missing'
                }
                label="Viewing booked"
                sublabel="Agent confirmed your knock within 2 hours"
                points={signals.viewing_status !== 'none' ? 5 : 0}
                maxPoints={MAX_POINTS.viewing - 5}
              />
              <SignalRow
                status={signals.viewing_status === 'attended' ? 'earned' : 'missing'}
                label="Viewing attended"
                sublabel="Replaces 'booked' — not cumulative"
                points={signals.viewing_status === 'attended' ? 10 : 0}
                maxPoints={MAX_POINTS.viewing}
              />
            </div>

          </CardContent>
        </Card>

        {/* Primary action */}
        <Link
          href="/buyer/knock/new"
          className="flex items-center gap-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 hover:border-blue-400 hover:bg-blue-100 transition-all"
        >
          <span className="text-2xl">🚪</span>
          <div>
            <p className="text-sm font-bold text-blue-900">Knock on a property</p>
            <p className="text-xs text-blue-600">Send a viewing request — agent has 2 hours to confirm</p>
          </div>
        </Link>

        {/* Verification quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/buyer/verify/documents"
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <span className="text-xl">📄</span>
            <span className="text-sm font-semibold text-gray-900">Upload documents</span>
            <span className="text-xs text-gray-400">Proof of funds, MIP, or contract</span>
          </Link>
          <Link
            href="/buyer/verify/id"
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <span className="text-xl">🪪</span>
            <span className="text-sm font-semibold text-gray-900">ID verification</span>
            <span className="text-xs text-gray-400">Coming soon</span>
          </Link>
        </div>

        {/* Preferences summary */}
        {prefs && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your search</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5 text-gray-600">
              {prefs.target_area && (
                <p><span className="text-gray-400 w-20 inline-block">Area</span>{prefs.target_area}</p>
              )}
              {prefs.budget_range && (
                <p><span className="text-gray-400 w-20 inline-block">Budget</span>{prefs.budget_range}</p>
              )}
              {prefs.move_timeframe && (
                <p>
                  <span className="text-gray-400 w-20 inline-block">Timeframe</span>
                  {TIMEFRAME_LABELS[prefs.move_timeframe] ?? prefs.move_timeframe}
                </p>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
