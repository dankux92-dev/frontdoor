'use client'

import { useRouter } from 'next/navigation'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-opacity active:opacity-70"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
}
