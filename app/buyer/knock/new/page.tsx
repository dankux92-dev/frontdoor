'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createKnock } from './actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewKnockPage() {
  const [state, formAction, pending] = useActionState(createKnock, {})

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <Link
            href="/buyer/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Knock on a property</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter the property details below. The covering agent will have 2 hours to confirm
            your viewing request.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Property details</CardTitle>
            <CardDescription>
              We&apos;ll match you with the agent who covers that postcode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="property_address">Property address</Label>
                <Input
                  id="property_address"
                  name="property_address"
                  placeholder="12 Example Street, London"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="property_postcode">Postcode</Label>
                <Input
                  id="property_postcode"
                  name="property_postcode"
                  placeholder="SW1A 1AA"
                  className="uppercase"
                  required
                />
              </div>

              {state.error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Sending knock…' : 'Send knock'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-gray-400">
          The agent has 2 hours to confirm. If they don&apos;t respond, your knock expires
          automatically.
        </p>
      </div>
    </div>
  )
}
