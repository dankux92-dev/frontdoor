'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Knock = {
  id: string
  status: 'pending' | 'confirmed' | 'expired'
  property_address: string
  property_postcode: string
  expires_at: string
}

function formatTime(ms: number) {
  if (ms <= 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

export function KnockStatus({ knock }: { knock: Knock }) {
  const router = useRouter()
  const [msLeft, setMsLeft] = useState(() => new Date(knock.expires_at).getTime() - Date.now())
  const [status, setStatus] = useState(knock.status)

  // Countdown tick
  useEffect(() => {
    if (status !== 'pending') return
    const id = setInterval(() => {
      const remaining = new Date(knock.expires_at).getTime() - Date.now()
      setMsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(id)
        setStatus('expired')
      }
    }, 1000)
    return () => clearInterval(id)
  }, [knock.expires_at, status])

  // Poll every 15 seconds to pick up agent confirmation
  useEffect(() => {
    if (status !== 'pending') return
    const id = setInterval(() => router.refresh(), 15_000)
    return () => clearInterval(id)
  }, [status, router])

  // Sync if server refreshes the knock status
  useEffect(() => {
    setStatus(knock.status)
  }, [knock.status])

  if (status === 'confirmed') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Viewing confirmed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-green-800">
          <p>
            The agent has confirmed your viewing request for{' '}
            <strong>{knock.property_address}</strong>.
          </p>
          <p className="text-green-600">
            They&apos;ll be in touch shortly to arrange a time. Your intent score has been
            updated.
          </p>
          <Link
            href="/buyer/dashboard"
            className="inline-block font-medium underline underline-offset-2 hover:text-green-900"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (status === 'expired') {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-700">Knock expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            The agent didn&apos;t respond to your knock for{' '}
            <strong>{knock.property_address}</strong> within 2 hours.
          </p>
          <p className="text-gray-400">
            This sometimes happens when agents are busy. Try knocking again or search for
            another property.
          </p>
          <div className="flex gap-3 pt-1">
            <Link
              href="/buyer/knock/new"
              className="text-blue-600 font-medium hover:text-blue-800 underline underline-offset-2"
            >
              Knock again
            </Link>
            <Link
              href="/buyer/dashboard"
              className="text-gray-500 font-medium hover:text-gray-700 underline underline-offset-2"
            >
              Back to dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // pending
  return (
    <Card>
      <CardHeader>
        <CardTitle>Knock sent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Time remaining</p>
          <p className="text-5xl font-mono font-bold text-gray-900 tabular-nums">
            {formatTime(msLeft)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            The agent has until the timer runs out to confirm.
          </p>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="text-gray-400 w-20 inline-block">Property</span>
            {knock.property_address}
          </p>
          <p>
            <span className="text-gray-400 w-20 inline-block">Postcode</span>
            {knock.property_postcode}
          </p>
        </div>

        <p className="text-xs text-gray-400">
          This page refreshes automatically. You&apos;ll see confirmation here as soon as the
          agent responds.
        </p>

        <Link
          href="/buyer/dashboard"
          className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
        >
          ← Back to dashboard
        </Link>
      </CardContent>
    </Card>
  )
}
