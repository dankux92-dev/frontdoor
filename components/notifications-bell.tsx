'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export type BellNotification = {
  id: string
  type: string
  knock_id: string | null
  message: string
  read: boolean
  created_at: string
}

const OUTCOMES = [
  { value: 'booked',    label: 'Viewing booked' },
  { value: 'attended',  label: 'Viewing booked and attended' },
  { value: 'no_action', label: 'No further action' },
] as const

export function NotificationsBell({
  notifications: initial,
}: {
  notifications: BellNotification[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.read).length

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Sync when server refreshes props
  useEffect(() => { setNotifs(initial) }, [initial])

  async function recordOutcome(notifId: string, outcome: string) {
    setLoading(notifId)
    const res = await fetch(`/api/notifications/${notifId}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    })
    if (res.ok) {
      setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
      router.refresh()
    }
    setLoading(null)
  }

  async function dismiss(notifId: string) {
    setLoading(notifId)
    const res = await fetch(`/api/notifications/${notifId}/read`, { method: 'POST' })
    if (res.ok) {
      setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unread > 0 && (
              <span className="text-xs text-gray-400">{unread} unread</span>
            )}
          </div>

          {notifs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              No notifications yet
            </p>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {notifs.map(n => (
                <li
                  key={n.id}
                  className={`px-4 py-3 space-y-2.5 transition-colors ${
                    n.read ? 'bg-white' : 'bg-blue-50/40'
                  }`}
                >
                  {/* Unread dot + message */}
                  <div className="flex gap-2.5">
                    {!n.read && (
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                    <p className={`text-sm leading-snug ${n.read ? 'text-gray-500 ml-4' : 'text-gray-800'}`}>
                      {n.message}
                    </p>
                  </div>

                  {/* Outcome action buttons */}
                  {!n.read && n.type === 'viewing_outcome_request' && (
                    <div className="flex flex-col gap-1.5 ml-4">
                      {OUTCOMES.map(o => (
                        <button
                          key={o.value}
                          onClick={() => recordOutcome(n.id, o.value)}
                          disabled={loading === n.id}
                          className="text-left text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium text-gray-700 transition-colors disabled:opacity-50"
                        >
                          {loading === n.id ? 'Saving…' : o.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Dismiss for non-outcome types */}
                  {!n.read && n.type !== 'viewing_outcome_request' && (
                    <button
                      onClick={() => dismiss(n.id)}
                      disabled={loading === n.id}
                      className="ml-4 text-xs text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                    >
                      {loading === n.id ? 'Saving…' : 'Dismiss'}
                    </button>
                  )}

                  <p className="text-xs text-gray-400 ml-4">
                    {new Date(n.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
