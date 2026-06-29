'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signUp } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Selection = 'agent' | 'buyer_renter' | null

const BUYING_BUDGETS = [
  'Under £150,000',
  '£150,000 – £250,000',
  '£250,000 – £400,000',
  '£400,000 – £600,000',
  '£600,000+',
]

const RENTING_BUDGETS = [
  'Under £800/mo',
  '£800 – £1,200/mo',
  '£1,200 – £1,800/mo',
  '£1,800 – £2,500/mo',
  '£2,500+/mo',
]

const TIMEFRAMES = [
  { label: 'Within 3 months', value: '0-3' },
  { label: '3 – 6 months', value: '3-6' },
  { label: '6+ months', value: '6+' },
]

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, {})
  const [selection, setSelection] = useState<Selection>(null)
  const [buyerType, setBuyerType] = useState<'buyer' | 'renter'>('buyer')

  if (!selection) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>
          <p className="text-sm text-gray-500 mt-1">How will you use Front Door?</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelection('agent')}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
          >
            <span className="text-3xl">🏢</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Estate Agent</p>
              <p className="text-xs text-gray-500 mt-0.5">I work with sellers and landlords</p>
            </div>
          </button>

          <button
            onClick={() => setSelection('buyer_renter')}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
          >
            <span className="text-3xl">🏠</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Buyer / Renter</p>
              <p className="text-xs text-gray-500 mt-0.5">I&apos;m looking to move</p>
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  const isAgent = selection === 'agent'
  const role = isAgent ? 'agent' : buyerType
  const budgets = buyerType === 'buyer' ? BUYING_BUDGETS : RENTING_BUDGETS

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
        </div>
        <CardTitle>{isAgent ? 'Agent account' : 'Buyer / Renter account'}</CardTitle>
        <CardDescription>
          {isAgent
            ? 'Access verified leads in your area'
            : 'Get verified and stand out to agents'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="role" value={role} />

          {/* Buyer/renter type toggle */}
          {!isAgent && (
            <div className="space-y-1">
              <Label>I&apos;m looking to</Label>
              <RadioGroup
                value={buyerType}
                onValueChange={(v) => setBuyerType(v as 'buyer' | 'renter')}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="buyer" id="type-buy" />
                  <Label htmlFor="type-buy" className="font-normal cursor-pointer">Buy</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="renter" id="type-rent" />
                  <Label htmlFor="type-rent" className="font-normal cursor-pointer">Rent</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Common fields */}
          <div className="space-y-1">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" placeholder="Jane Smith" required />
          </div>

          {/* Agent-specific fields */}
          {isAgent && (
            <>
              <div className="space-y-1">
                <Label htmlFor="agency_name">Agency name</Label>
                <Input id="agency_name" name="agency_name" placeholder="Acme Property" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="areas">Target postcode areas</Label>
                <Input
                  id="areas"
                  name="areas"
                  placeholder="SW1, E1, N1"
                />
                <p className="text-xs text-gray-400">Comma-separated, e.g. SW1, E1, N1</p>
              </div>
            </>
          )}

          {/* Buyer/renter-specific fields */}
          {!isAgent && (
            <>
              <div className="space-y-1">
                <Label htmlFor="target_area">Target area</Label>
                <Input
                  id="target_area"
                  name="target_area"
                  placeholder="e.g. East London, Bristol"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Budget</Label>
                <Select name="budget_range" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a range" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Move timeframe</Label>
                <Select name="move_timeframe" required>
                  <SelectTrigger>
                    <SelectValue placeholder="When are you looking to move?" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Credentials */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
