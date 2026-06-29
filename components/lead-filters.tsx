'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TIMEFRAME_OPTIONS = [
  { value: '', label: 'Any timeline' },
  { value: '0-3', label: 'Within 3 months' },
  { value: '3-6', label: '3 – 6 months' },
  { value: '6+', label: '6+ months' },
]

const MIN_SCORE_OPTIONS = [
  { value: '0', label: 'Any score' },
  { value: '25', label: '25+' },
  { value: '50', label: '50+' },
  { value: '75', label: '75+' },
]

export function LeadFilters({
  basePath,
  initialArea,
  initialMinScore,
  initialTimeframe,
}: {
  basePath: string
  initialArea: string
  initialMinScore: number
  initialTimeframe: string
}) {
  const router = useRouter()
  const [area, setArea] = useState(initialArea)
  const [minScore, setMinScore] = useState(initialMinScore > 0 ? String(initialMinScore) : '0')
  const [timeframe, setTimeframe] = useState(initialTimeframe)

  const hasFilters = area || minScore !== '0' || timeframe
  const activeCount = [area, minScore !== '0', timeframe].filter(Boolean).length

  function apply() {
    const params = new URLSearchParams()
    if (area) params.set('area', area)
    if (minScore && minScore !== '0') params.set('min_score', minScore)
    if (timeframe) params.set('timeframe', timeframe)
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ''}`)
  }

  function clear() {
    setArea('')
    setMinScore('0')
    setTimeframe('')
    router.push(basePath)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Filter leads
          {activeCount > 0 && (
            <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
        </p>
        {hasFilters && (
          <button
            onClick={clear}
            className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="filter-area" className="text-xs">Postcode area</Label>
          <Input
            id="filter-area"
            placeholder="e.g. SW1, M1"
            value={area}
            onChange={e => setArea(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Minimum score</Label>
          <Select value={minScore} onValueChange={v => setMinScore(v ?? '0')}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MIN_SCORE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Move timeframe</Label>
          <Select value={timeframe || '_any'} onValueChange={v => setTimeframe(v === '_any' ? '' : (v ?? ''))}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAME_OPTIONS.map(o => (
                <SelectItem key={o.value || '_any'} value={o.value || '_any'}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button size="sm" onClick={apply}>Apply filters</Button>
    </div>
  )
}
