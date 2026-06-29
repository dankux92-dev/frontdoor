'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { recordPropertyAction } from '@/app/buyer/knock/swipe-actions'

export type SwipeProperty = {
  id: string
  address: string
  postcode: string
  price: number
  property_type: 'house' | 'flat' | 'other'
  bedrooms: number
  description: string | null
}

const THRESHOLD = 100

function formatPrice(p: number) {
  if (p >= 1_000_000) {
    const m = p / 1_000_000
    return '£' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'm'
  }
  return '£' + (p / 1000).toFixed(0) + 'k'
}

function PropertyTypeBadge({ type }: { type: SwipeProperty['property_type'] }) {
  const labels = { house: 'House', flat: 'Flat', other: 'Property' }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
      {labels[type]}
    </span>
  )
}

function CardImage({ type }: { type: SwipeProperty['property_type'] }) {
  const gradients = {
    house: 'from-emerald-300 via-teal-400 to-teal-600',
    flat: 'from-sky-300 via-blue-400 to-indigo-600',
    other: 'from-amber-300 via-orange-400 to-orange-600',
  }
  const icons = {
    house: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-white/50">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    flat: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-white/50">
        <rect x="1" y="3" width="15" height="18" />
        <path d="M16 8h4l3 3v10H16V8z" />
        <line x1="5" y1="8" x2="5" y2="8.01" />
        <line x1="5" y1="12" x2="5" y2="12.01" />
        <line x1="5" y1="16" x2="5" y2="16.01" />
        <line x1="10" y1="8" x2="10" y2="8.01" />
        <line x1="10" y1="12" x2="10" y2="12.01" />
        <line x1="10" y1="16" x2="10" y2="16.01" />
      </svg>
    ),
    other: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-white/50">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  }
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradients[type]} flex items-center justify-center`}>
      {icons[type]}
    </div>
  )
}

function PropertyCard({
  property,
  dragOffset,
  isDragging,
}: {
  property: SwipeProperty
  dragOffset: { x: number; y: number }
  isDragging: boolean
}) {
  const { x, y } = dragOffset
  const absX = Math.abs(x)
  const absY = Math.abs(y)

  const archiveOpacity = isDragging && x < 0 ? Math.min(absX / THRESHOLD, 1) : 0
  const saveOpacity    = isDragging && x > 0 ? Math.min(absX / THRESHOLD, 1) : 0
  const knockOpacity   = isDragging && y < 0 && absY > absX ? Math.min(absY / THRESHOLD, 1) : 0

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl select-none bg-white"
      style={{ height: 'calc(100dvh - 180px)', maxHeight: '580px', minHeight: '400px' }}
    >
      {/* Photo area */}
      <div className="relative h-[55%]">
        <CardImage type={property.property_type} />

        {/* Direction indicators */}
        {archiveOpacity > 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-t-3xl"
            style={{ backgroundColor: `rgba(239,68,68,${archiveOpacity * 0.7})`, opacity: archiveOpacity }}>
            <div className="bg-red-500 rounded-full p-4 shadow-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" className="w-10 h-10">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
        )}
        {saveOpacity > 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-t-3xl"
            style={{ backgroundColor: `rgba(34,197,94,${saveOpacity * 0.7})`, opacity: saveOpacity }}>
            <div className="bg-green-500 rounded-full p-4 shadow-lg">
              <svg viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-10 h-10">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>
        )}
        {knockOpacity > 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-t-3xl"
            style={{ backgroundColor: `rgba(58,112,104,${knockOpacity * 0.85})`, opacity: knockOpacity }}>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full p-4 shadow-lg" style={{ backgroundColor: '#3A7068' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-wide">Knock</span>
            </div>
          </div>
        )}

        {/* Property type badge */}
        <div className="absolute top-3 left-3">
          <PropertyTypeBadge type={property.property_type} />
        </div>
        {/* Bedrooms */}
        <div className="absolute top-3 right-3 bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
            <path d="M2 4v16" /><path d="M22 4v16" />
            <path d="M2 8h20" /><path d="M2 12h20" />
            <rect x="6" y="4" width="12" height="4" />
          </svg>
          <span className="text-white text-xs font-semibold">{property.bedrooms} bed</span>
        </div>
      </div>

      {/* Info area */}
      <div className="h-[45%] p-5 flex flex-col justify-between">
        <div>
          <p className="font-bold text-gray-900 text-lg leading-tight">{property.address}</p>
          <p className="text-gray-500 text-sm mt-0.5">{property.postcode}</p>
          {property.description && (
            <p className="text-gray-600 text-sm mt-2 line-clamp-2">{property.description}</p>
          )}
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-extrabold" style={{ color: '#3A7068' }}>{formatPrice(property.price)}</span>
          <div className="text-right text-xs text-gray-400 space-y-0.5">
            <p>← Archive</p>
            <p>→ Save</p>
            <p>↑ Knock</p>
          </div>
        </div>
      </div>
    </div>
  )
}

type Phase = 'idle' | 'dragging' | 'springing' | 'exiting'

function VerificationPrompt({
  knockId,
  onDismiss,
}: {
  knockId: string
  onDismiss: () => void
}) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div
        className="w-full max-w-md rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl"
        style={{ backgroundColor: '#F5F0E8' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5" />

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: '#3A7068' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <h2 className="text-xl font-extrabold text-gray-900 mb-2">Boost your chances</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          Agents prioritise verified buyers. Uploading your proof of funds and completing ID verification can significantly increase your chances of hearing back.
        </p>

        <button
          onClick={() => router.push('/buyer/profile')}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm mb-3 transition-opacity active:opacity-80"
          style={{ backgroundColor: '#3A7068' }}
        >
          Complete verification →
        </button>

        <button
          onClick={() => {
            onDismiss()
            router.push(`/buyer/knock/${knockId}`)
          }}
          className="w-full py-3 rounded-2xl font-semibold text-sm transition-colors"
          style={{ color: '#3A7068', backgroundColor: 'transparent' }}
        >
          View knock status
        </button>
      </div>
    </div>
  )
}

export function SwipeDeck({ properties }: { properties: SwipeProperty[] }) {
  const router = useRouter()
  const [deck, setDeck] = useState(properties)
  const [phase, setPhase] = useState<Phase>('idle')
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [exitOffset, setExitOffset] = useState({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)
  const [verificationPrompt, setVerificationPrompt] = useState<string | null>(null) // knockId
  const dragStart = useRef({ x: 0, y: 0 })
  const actionInFlight = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== 'idle' || deck.length === 0 || actionInFlight.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, y: e.clientY }
    setDragOffset({ x: 0, y: 0 })
    setPhase('dragging')
  }, [phase, deck.length])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (phase !== 'dragging') return
    setDragOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }, [phase])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (phase !== 'dragging') return

    const { x, y } = dragOffset
    const absX = Math.abs(x), absY = Math.abs(y)

    let dir: 'left' | 'right' | 'up' | null = null
    if (y < -THRESHOLD && absY > absX) dir = 'up'
    else if (x < -THRESHOLD) dir = 'left'
    else if (x > THRESHOLD) dir = 'right'

    if (!dir) {
      setPhase('springing')
      setTimeout(() => {
        setDragOffset({ x: 0, y: 0 })
        setPhase('idle')
      }, 250)
      return
    }

    const W = (typeof window !== 'undefined' ? window.innerWidth : 500) + 200
    const H = (typeof window !== 'undefined' ? window.innerHeight : 900) + 200

    const ex = dir === 'left' ? -W : dir === 'right' ? W : x * 1.5
    const ey = dir === 'up' ? -H : y * 1.5

    setExitOffset({ x: ex, y: ey })
    setPhase('exiting')

    const property = deck[0]
    const action = dir === 'left' ? 'archived' : dir === 'right' ? 'saved' : 'knocked'

    actionInFlight.current = true
    setTimeout(async () => {
      try {
        const result = await recordPropertyAction(property.id, action)
        setDeck(prev => prev.slice(1))
        setDragOffset({ x: 0, y: 0 })
        setPhase('idle')
        if (result?.error) {
          setError(result.error)
        } else if (result?.knockId) {
          if (result.needsVerification) {
            setVerificationPrompt(result.knockId)
          } else {
            router.push(`/buyer/knock/${result.knockId}`)
          }
        }
      } finally {
        actionInFlight.current = false
      }
    }, 300)
  }, [phase, dragOffset, deck, router])

  if (deck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#3A7068' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-8 h-8">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">All caught up</h3>
        <p className="text-gray-500 text-sm leading-relaxed">No more properties to show right now. Check back soon for new listings in your area.</p>
      </div>
    )
  }

  const topOffset = phase === 'exiting' ? exitOffset
    : phase === 'dragging' || phase === 'springing' ? dragOffset
    : { x: 0, y: 0 }

  const topTransition = phase === 'exiting' ? 'transform 0.3s ease-out'
    : phase === 'springing' ? 'transform 0.25s ease'
    : 'none'

  const rotation = topOffset.x * 0.08

  return (
    <div className="relative w-full flex-1 flex flex-col overflow-hidden">
      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2 z-50">
          <p className="text-amber-800 text-sm leading-snug">{error}</p>
          <button onClick={() => setError(null)} className="text-amber-500 shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Verification prompt modal */}
      {verificationPrompt && (
        <VerificationPrompt
          knockId={verificationPrompt}
          onDismiss={() => setVerificationPrompt(null)}
        />
      )}

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center px-4 py-3">
        <div className="relative w-full max-w-sm" style={{ height: 'calc(100dvh - 200px)', maxHeight: '580px', minHeight: '400px' }}>
          {deck.slice(0, 3).reverse().map((property, reversedIdx) => {
            const stackIdx = Math.min(deck.length - 1, 2) - reversedIdx
            const isTop = stackIdx === 0
            const scale = 1 - stackIdx * 0.04
            const translateY = stackIdx * 10

            let transform: string
            let transition: string

            if (isTop) {
              transform = `translate(${topOffset.x}px, ${topOffset.y}px) rotate(${rotation}deg)`
              transition = topTransition
            } else {
              transform = `translateY(${translateY}px) scale(${scale})`
              transition = 'transform 0.15s ease'
            }

            return (
              <div
                key={property.id}
                className="absolute inset-0"
                style={{ transform, transition, zIndex: 10 - stackIdx, touchAction: 'none', cursor: isTop ? 'grab' : 'default' }}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
              >
                <PropertyCard
                  property={property}
                  dragOffset={isTop && phase === 'dragging' ? dragOffset : { x: 0, y: 0 }}
                  isDragging={isTop && phase === 'dragging'}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
