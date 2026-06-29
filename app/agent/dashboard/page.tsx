import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogoutButton } from '@/components/logout-button'
import { NotificationsBell } from '@/components/notifications-bell'
import { AgentKnockCard } from '@/components/agent-knock-card'
import { LeadCard, type LeadCardData } from '@/components/lead-card'
import { LeadFilters } from '@/components/lead-filters'

export default async function AgentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; min_score?: string; timeframe?: string }>
}) {
  const params = await searchParams
  const filterArea = (params.area ?? '').trim()
  const filterMinScore = Math.max(0, parseInt(params.min_score ?? '0', 10) || 0)
  const filterTimeframe = params.timeframe ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agent } = await supabase
    .from('agents')
    .select('agency_name, areas, is_active')
    .eq('id', user!.id)
    .single()

  if (!agent?.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Account pending activation</CardTitle>
            <CardDescription>
              {agent?.agency_name ?? 'Your agency'} has been registered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>
              We&apos;re reviewing your details and will activate your account shortly.
              You&apos;ll receive an email as soon as you have access to the lead dashboard.
            </p>
            <p className="text-gray-400">
              Questions? Email us at{' '}
              <a href="mailto:hello@frontdooruk.co.uk" className="underline">
                hello@frontdooruk.co.uk
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Knocks + notifications ───────────────────────────────────────────────────
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [{ data: pendingKnocks }, { data: recentKnocks }, { data: notifs }] = await Promise.all([
    supabase
      .from('knocks')
      .select('id, property_postcode, status, expires_at, knocked_at')
      .eq('agent_id', user!.id)
      .eq('status', 'pending')
      .order('knocked_at', { ascending: true }),
    supabase
      .from('knocks')
      .select('id, property_postcode, status, expires_at, knocked_at')
      .eq('agent_id', user!.id)
      .in('status', ['confirmed', 'expired'])
      .gte('knocked_at', cutoff)
      .order('knocked_at', { ascending: false })
      .limit(10),
    supabase
      .from('notifications')
      .select('id, type, knock_id, message, read, created_at')
      .eq('profile_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  const allKnocks = [...(pendingKnocks ?? []), ...(recentKnocks ?? [])]

  // ── Lead feed ────────────────────────────────────────────────────────────────
  const admin = createAdminClient()

  // Fetch all buyer/renter profiles, their preferences, scores, and unlock status
  const { data: buyerProfiles } = await admin
    .from('profiles')
    .select('id, role, email, full_name')
    .in('role', ['buyer', 'renter'])

  let leads: LeadCardData[] = []

  if (buyerProfiles?.length) {
    const profileIds = buyerProfiles.map(p => p.id)

    const [{ data: preferences }, { data: scores }, { data: unlocked }] = await Promise.all([
      admin.from('buyer_preferences').select('id, target_area, budget_range, move_timeframe').in('id', profileIds),
      admin.from('intent_scores').select('profile_id, score').in('profile_id', profileIds),
      admin.from('leads').select('profile_id').eq('agent_id', user!.id).in('profile_id', profileIds),
    ])

    const prefMap = new Map(preferences?.map(p => [p.id, p]) ?? [])
    const scoreMap = new Map(scores?.map(s => [s.profile_id, s.score]) ?? [])
    const unlockedSet = new Set(unlocked?.map(l => l.profile_id) ?? [])

    leads = buyerProfiles.map(profile => {
      const pref = prefMap.get(profile.id)
      const score = scoreMap.get(profile.id) ?? 0
      const isUnlocked = unlockedSet.has(profile.id)
      return {
        profile_id: profile.id,
        role: profile.role as 'buyer' | 'renter',
        score,
        target_area: pref?.target_area ?? null,
        budget_range: pref?.budget_range ?? null,
        move_timeframe: pref?.move_timeframe ?? null,
        unlocked: isUnlocked,
        full_name: isUnlocked ? profile.full_name : null,
        email: isUnlocked ? profile.email : null,
      }
    })

    // Apply filters
    if (filterArea) {
      leads = leads.filter(l =>
        l.target_area?.toLowerCase().includes(filterArea.toLowerCase())
      )
    }
    if (filterMinScore > 0) {
      leads = leads.filter(l => l.score >= filterMinScore)
    }
    if (filterTimeframe) {
      leads = leads.filter(l => l.move_timeframe === filterTimeframe)
    }

    // Sort: score descending, unlocked last so fresh leads surface first
    leads.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? 1 : -1
      return b.score - a.score
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.agency_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Covering: {agent.areas.length > 0 ? agent.areas.join(', ') : 'No areas set'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell notifications={notifs ?? []} />
            <LogoutButton />
          </div>
        </div>

        {/* Knocks */}
        <Card>
          <CardHeader>
            <CardTitle>Knocks</CardTitle>
            <CardDescription>
              Viewing requests from verified buyers and renters. Respond within 2 hours to confirm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allKnocks.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">
                No knocks yet. They&apos;ll appear here when buyers request viewings in your area.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {allKnocks.map(knock => (
                  <AgentKnockCard key={knock.id} knock={knock} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Verified leads</h2>
            <p className="text-sm text-gray-400">
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
              {(filterArea || filterMinScore > 0 || filterTimeframe) ? ' matching filters' : ''}
            </p>
          </div>

          <LeadFilters
            basePath="/agent/dashboard"
            initialArea={filterArea}
            initialMinScore={filterMinScore}
            initialTimeframe={filterTimeframe}
          />

          {leads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">
                {filterArea || filterMinScore > 0 || filterTimeframe
                  ? 'No leads match your current filters. Try adjusting or clearing them.'
                  : 'No verified leads yet. They\'ll appear here as buyers complete verification.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {leads.map(lead => (
                <LeadCard key={lead.profile_id} lead={lead} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
