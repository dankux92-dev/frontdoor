export type MoveTimeframe = '0-3' | '3-6' | '6+'
export type ViewingStatus = 'none' | 'booked' | 'attended'

export type ScoreSignals = {
  id_verified: boolean
  documents_uploaded: boolean   // docs_url.length > 0
  documents_verified: boolean   // income_verified = true (admin-confirmed)
  move_timeframe: MoveTimeframe | null
  activity_streak: number       // consecutive active days
  viewing_status: ViewingStatus
}

export type PointsBreakdown = {
  id_verification: number   // max 15
  documents: number         // max 25
  move_timeframe: number    // max 20
  activity: number          // max 7
  viewing: number           // max 10
}

export const MAX_POINTS: PointsBreakdown = {
  id_verification: 15,
  documents: 25,
  move_timeframe: 20,
  activity: 7,
  viewing: 10,
}

// Total achievable is 77 (score is capped at 100)
export const TOTAL_MAX = (Object.values(MAX_POINTS) as number[]).reduce((a, b) => a + b, 0)

export function calculateScore(signals: ScoreSignals): {
  score: number
  breakdown: PointsBreakdown
} {
  const breakdown: PointsBreakdown = {
    id_verification: 0,
    documents: 0,
    move_timeframe: 0,
    activity: 0,
    viewing: 0,
  }

  // ID verification: +15 (permanent)
  if (signals.id_verified) {
    breakdown.id_verification = 15
  }

  // Documents: +25. Awarded on upload; labelled "pending" until admin verifies.
  if (signals.documents_uploaded || signals.documents_verified) {
    breakdown.documents = 25
  }

  // Move timeframe: permanent once set
  if (signals.move_timeframe === '0-3') breakdown.move_timeframe = 20
  else if (signals.move_timeframe === '3-6') breakdown.move_timeframe = 10
  else if (signals.move_timeframe === '6+') breakdown.move_timeframe = 2

  // Activity streak: 7+ beats 3+, not cumulative
  if (signals.activity_streak >= 7) breakdown.activity = 7
  else if (signals.activity_streak >= 3) breakdown.activity = 2

  // Viewing: attended beats booked, not cumulative
  if (signals.viewing_status === 'attended') breakdown.viewing = 10
  else if (signals.viewing_status === 'booked') breakdown.viewing = 5

  const raw =
    breakdown.id_verification +
    breakdown.documents +
    breakdown.move_timeframe +
    breakdown.activity +
    breakdown.viewing

  return { score: Math.min(100, Math.max(0, raw)), breakdown }
}
