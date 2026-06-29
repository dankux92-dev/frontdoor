import { createAdminClient } from '@/lib/supabase/admin'
import { calculateScore, ScoreSignals } from './calculate'

export async function logActivity(userId: string) {
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  await admin
    .from('activity_log')
    .upsert({ profile_id: userId, date: today, active: true }, { onConflict: 'profile_id,date' })
}

export async function recomputeScore(userId: string) {
  const admin = createAdminClient()

  const [
    { data: verification },
    { data: prefs },
    { data: activityLogs },
    { data: knocks },
  ] = await Promise.all([
    admin
      .from('verifications')
      .select('id_check_result, income_verified, docs_url')
      .eq('profile_id', userId)
      .single(),
    admin
      .from('buyer_preferences')
      .select('move_timeframe')
      .eq('id', userId)
      .single(),
    admin
      .from('activity_log')
      .select('date, active')
      .eq('profile_id', userId)
      .order('date', { ascending: false })
      .limit(30),
    admin
      .from('knocks')
      .select('id')
      .eq('profile_id', userId)
      .eq('status', 'confirmed'),
  ])

  // Resolve viewing status via confirmed knock IDs
  let viewingStatus: ScoreSignals['viewing_status'] = 'none'
  const knockIds = knocks?.map(k => k.id) ?? []
  if (knockIds.length > 0) {
    const { data: viewings } = await admin
      .from('viewings')
      .select('outcome')
      .in('knock_id', knockIds)
    if (viewings?.some(v => v.outcome === 'attended')) viewingStatus = 'attended'
    else if (viewings?.some(v => v.outcome === 'booked')) viewingStatus = 'booked'
  }

  const signals: ScoreSignals = {
    id_verified: verification?.id_check_result === 'pass',
    documents_uploaded: (verification?.docs_url?.length ?? 0) > 0,
    documents_verified: verification?.income_verified ?? false,
    move_timeframe: prefs?.move_timeframe ?? null,
    activity_streak: computeStreak(activityLogs ?? []),
    viewing_status: viewingStatus,
  }

  const { score, breakdown } = calculateScore(signals)

  await admin
    .from('intent_scores')
    .upsert(
      {
        profile_id: userId,
        score,
        signals: { ...signals, breakdown },
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' }
    )

  return { score, signals, breakdown }
}

function computeStreak(logs: { date: string; active: boolean }[]): number {
  if (logs.length === 0) return 0

  const activeDates = new Set(logs.filter(l => l.active).map(l => l.date))
  let streak = 0

  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (activeDates.has(dateStr)) streak++
    else break
  }

  return streak
}
