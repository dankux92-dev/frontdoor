import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NotificationsBell } from '@/components/notifications-bell'
import { LogoutButton } from '@/components/logout-button'
import { recomputeScore } from '@/lib/scoring/recompute'
import { MAX_POINTS, TOTAL_MAX } from '@/lib/scoring/calculate'

const TIMEFRAME_LABELS: Record<string, string> = {
  '0-3': 'Within 3 months',
  '3-6': '3 – 6 months',
  '6+': '6+ months',
}

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
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-base mt-0.5 shrink-0">
          {status === 'earned' ? '✅' : status === 'pending' ? '⏳' : '⬜'}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
          {action && status === 'missing' && (
            <Link href={action.href} className="text-xs font-bold mt-0.5 inline-block" style={{ color: '#3A7068' }}>
              {action.label} →
            </Link>
          )}
        </div>
      </div>
      <span className={`text-sm shrink-0 font-medium ${
        status === 'earned' ? 'text-green-700' : status === 'pending' ? 'text-amber-600' : 'text-gray-300'
      }`}>
        {status === 'earned' ? `+${points}` : `+${maxPoints}`}
        <span className="text-xs font-normal"> pts</span>
      </span>
    </div>
  )
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { score, signals, breakdown } = await recomputeScore(user!.id)

  const [{ data: profile }, { data: prefs }, { data: notifs }] = await Promise.all([
    supabase.from('profiles').select('full_name, role, email').eq('id', user!.id).single(),
    supabase.from('buyer_preferences').select('*').eq('id', user!.id).single(),
    supabase
      .from('notifications')
      .select('id, type, knock_id, message, read, created_at')
      .eq('profile_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const pct = Math.round((score / TOTAL_MAX) * 100)

  // Next steps: ordered list of missing signals
  const nextSteps = [
    !signals.id_verified && {
      label: 'Complete ID verification',
      desc: 'Earns +15 pts permanently',
      href: '/buyer/verify/id',
    },
    !signals.documents_uploaded && !signals.documents_verified && {
      label: 'Upload proof of funds, MIP or employment contract',
      desc: 'Earns +25 pts (awarded on upload)',
      href: '/buyer/verify/documents',
    },
    !signals.move_timeframe && {
      label: 'Set your move timeframe',
      desc: 'Earns up to +20 pts',
      href: '/buyer/search',
    },
    signals.viewing_status === 'none' && {
      label: 'Request a viewing by knocking on a property',
      desc: 'Earns up to +10 pts',
      href: '/buyer/knock',
    },
  ].filter(Boolean) as Array<{ label: string; desc: string; href: string }>

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: '#3A7068' }}>Profile</h1>
            <p className="text-gray-500 text-sm font-medium mt-0.5">{profile?.full_name ?? user?.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell notifications={notifs ?? []} />
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4">

        {/* Score card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Intent score</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-6xl font-extrabold" style={{ color: '#3A7068' }}>{score}</span>
            <span className="text-gray-400 text-xl mb-2">/ 100</span>
          </div>
          {/* Score bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: '#3A7068' }}
            />
          </div>
          <p className="text-xs text-gray-400">
            Max achievable: {TOTAL_MAX} pts · Agents can see your score when browsing leads.
          </p>
        </div>

        {/* Next steps */}
        {nextSteps.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Boost your score</p>
            <ol className="space-y-3">
              {nextSteps.map((step, i) => (
                <li key={step.href} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: '#3A7068' }}>
                    {i + 1}
                  </span>
                  <div>
                    <Link href={step.href} className="text-sm font-semibold text-gray-800 hover:underline">
                      {step.label}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Score breakdown */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">What earns points</p>

          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-300 mt-3 mb-0">Permanent</p>
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
              status={signals.documents_verified ? 'earned' : signals.documents_uploaded ? 'pending' : 'missing'}
              label={signals.documents_verified ? 'Documents verified' : signals.documents_uploaded ? 'Documents uploaded' : 'Proof of funds / MIP / employment contract'}
              sublabel={signals.documents_uploaded && !signals.documents_verified ? 'Under review — we\'ll confirm shortly' : undefined}
              points={breakdown.documents}
              maxPoints={MAX_POINTS.documents}
              action={{ href: '/buyer/verify/documents', label: 'Upload document' }}
            />
            <SignalRow
              status={signals.move_timeframe ? 'earned' : 'missing'}
              label={signals.move_timeframe ? `Move timeframe: ${TIMEFRAME_LABELS[signals.move_timeframe]}` : 'Move timeframe'}
              sublabel={signals.move_timeframe ? undefined : 'Set during sign-up'}
              points={breakdown.move_timeframe}
              maxPoints={MAX_POINTS.move_timeframe}
            />
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-300 mt-4 mb-0">Viewings</p>
          <div className="divide-y divide-gray-100">
            <SignalRow
              status={signals.viewing_status !== 'none' ? 'earned' : 'missing'}
              label="Viewing booked"
              sublabel="Agent confirmed knock within 2 hours"
              points={5}
              maxPoints={5}
            />
            <SignalRow
              status={signals.viewing_status === 'attended' ? 'earned' : 'missing'}
              label="Viewing attended"
              sublabel="Replaces 'booked' — not cumulative"
              points={breakdown.viewing}
              maxPoints={MAX_POINTS.viewing}
            />
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Documents</p>
          <Link
            href="/buyer/verify/documents"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors"
            style={{ backgroundColor: '#F5F0E8' }}
          >
            <span className="text-2xl">📄</span>
            <div>
              <p className="text-sm font-bold text-gray-800">Upload proof of funds, MIP or employment contract</p>
              <p className="text-xs text-gray-400 mt-0.5">Earns +25 pts on upload</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-gray-400 ml-auto shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
          <Link
            href="/buyer/verify/id"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-2 transition-colors"
            style={{ backgroundColor: '#F5F0E8' }}
          >
            <span className="text-2xl">🪪</span>
            <div>
              <p className="text-sm font-bold text-gray-800">ID verification</p>
              <p className="text-xs text-gray-400 mt-0.5">Coming soon · Earns +15 pts</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-gray-400 ml-auto shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Search preferences */}
        {prefs && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Search preferences</p>
            <div className="space-y-2 text-sm text-gray-700">
              {prefs.target_area && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Area</span>
                  <span className="font-semibold">{prefs.target_area}</span>
                </div>
              )}
              {prefs.budget_range && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Budget</span>
                  <span className="font-semibold">{prefs.budget_range}</span>
                </div>
              )}
              {prefs.move_timeframe && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Timeframe</span>
                  <span className="font-semibold">{TIMEFRAME_LABELS[prefs.move_timeframe] ?? prefs.move_timeframe}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account details */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Account</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="font-semibold text-gray-700">{profile?.email ?? user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Account type</span>
              <span className="font-semibold text-gray-700 capitalize">{profile?.role}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
