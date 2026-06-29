'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export type LeadCardData = {
  profile_id: string
  role: 'buyer' | 'renter'
  score: number
  target_area: string | null
  budget_range: string | null
  move_timeframe: '0-3' | '3-6' | '6+' | null
  unlocked: boolean
  full_name: string | null
  email: string | null
}

const TIMEFRAME_LABELS: Record<string, string> = {
  '0-3': 'Within 3 months',
  '3-6': '3 – 6 months',
  '6+': '6+ months',
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 60
      ? 'bg-green-100 text-green-800'
      : score >= 30
      ? 'bg-amber-100 text-amber-800'
      : 'bg-gray-100 text-gray-600'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold tabular-nums ${color}`}>
      {score}
    </span>
  )
}

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const router = useRouter()
  const [localUnlocked, setLocalUnlocked] = useState(lead.unlocked)
  const [contact, setContact] = useState<{ full_name: string | null; email: string | null }>({
    full_name: lead.full_name,
    email: lead.email,
  })
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUnlock() {
    setUnlocking(true)
    setError(null)
    const res = await fetch(`/api/leads/${lead.profile_id}/unlock`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setContact({ full_name: data.full_name, email: data.email })
      setLocalUnlocked(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setUnlocking(false)
    }
  }

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 ${localUnlocked ? 'border-blue-200' : 'border-gray-200'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScoreBadge score={lead.score} />
          <span className="text-xs font-medium text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded-full">
            {lead.role}
          </span>
          {localUnlocked && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Unlocked
            </span>
          )}
        </div>
      </div>

      {/* Lead details */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-400">Area</p>
          <p className="font-medium text-gray-800 truncate">{lead.target_area ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Budget</p>
          <p className="font-medium text-gray-800 truncate">{lead.budget_range ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Timeline</p>
          <p className="font-medium text-gray-800">
            {lead.move_timeframe ? TIMEFRAME_LABELS[lead.move_timeframe] : '—'}
          </p>
        </div>
      </div>

      {/* Contact details (unlocked) */}
      {localUnlocked && (
        <div className="border-t border-blue-100 pt-3 space-y-1 text-sm">
          <p>
            <span className="text-gray-400 w-16 inline-block">Name</span>
            <span className="font-medium text-gray-900">{contact.full_name ?? 'Not provided'}</span>
          </p>
          <p>
            <span className="text-gray-400 w-16 inline-block">Email</span>
            <a
              href={`mailto:${contact.email}`}
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              {contact.email}
            </a>
          </p>
          <div className="pt-1">
            <Link
              href={`/agent/leads/${lead.profile_id}`}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2"
            >
              View full profile →
            </Link>
          </div>
        </div>
      )}

      {/* Unlock CTA */}
      {!localUnlocked && (
        <div className="border-t border-gray-100 pt-3">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <Button size="sm" onClick={handleUnlock} disabled={unlocking}>
            {unlocking ? 'Unlocking…' : 'Unlock contact details'}
          </Button>
        </div>
      )}
    </div>
  )
}
