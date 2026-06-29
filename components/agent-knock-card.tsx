'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Knock = {
  id: string
  property_postcode: string
  status: 'pending' | 'confirmed' | 'expired'
  expires_at: string
  knocked_at: string
}

function formatTimeLeft(ms: number) {
  if (ms <= 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m left`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} left`
}

export function AgentKnockCard({ knock }: { knock: Knock }) {
  const router = useRouter()
  const [msLeft, setMsLeft] = useState(() => new Date(knock.expires_at).getTime() - Date.now())
  const [localStatus, setLocalStatus] = useState(knock.status)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const outward = knock.property_postcode.trim().toUpperCase().split(/\s+/)[0]
  const isExpired = localStatus === 'expired' || msLeft <= 0

  useEffect(() => {
    if (localStatus !== 'pending') return
    const id = setInterval(() => {
      const remaining = new Date(knock.expires_at).getTime() - Date.now()
      setMsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(id)
        setLocalStatus('expired')
      }
    }, 1000)
    return () => clearInterval(id)
  }, [knock.expires_at, localStatus])

  // Sync server status after router.refresh()
  useEffect(() => {
    setLocalStatus(knock.status)
  }, [knock.status])

  async function handleConfirm() {
    setConfirming(true)
    setError(null)
    const res = await fetch(`/api/knock/${knock.id}/confirm`, { method: 'POST' })
    if (res.ok) {
      setLocalStatus('confirmed')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setConfirming(false)
    }
  }

  return (
    <div
      className={`flex items-center justify-between py-3.5 gap-4 ${
        isExpired ? 'opacity-40' : ''
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{outward}</p>
        {isExpired ? (
          <p className="text-xs text-gray-400">Expired</p>
        ) : localStatus === 'confirmed' ? (
          <p className="text-xs text-green-600">Viewing confirmed</p>
        ) : (
          <p className="text-xs text-gray-400 tabular-nums">
            {formatTimeLeft(msLeft) ?? 'Expiring…'}
          </p>
        )}
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>

      <div className="shrink-0">
        {localStatus === 'confirmed' ? (
          <span className="text-xs font-medium text-green-600">✓ Confirmed</span>
        ) : isExpired ? (
          <span className="text-xs text-gray-400">No action</span>
        ) : (
          <Button size="sm" onClick={handleConfirm} disabled={confirming}>
            {confirming ? 'Confirming…' : 'Confirm viewing'}
          </Button>
        )}
      </div>
    </div>
  )
}
