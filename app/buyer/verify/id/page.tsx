import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function IdVerificationPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ID verification</CardTitle>
          <CardDescription>
            Confirms you are who you say you are — worth +15 points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Coming soon state */}
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <div className="text-4xl mb-3">🪪</div>
            <h3 className="font-semibold text-gray-900 text-base">Coming soon</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              We&apos;re integrating with an FCA-compliant UK identity verification provider
              (Onfido or Yoti). This will be a guided, in-app flow taking under 3 minutes.
            </p>
          </div>

          {/* What it will cover */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">What you&apos;ll need</p>
            <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
              <li>A valid UK passport, driving licence, or national ID card</li>
              <li>Your phone camera (for a quick selfie match)</li>
              <li>About 2–3 minutes</li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
            In the meantime, boost your score by{' '}
            <Link href="/buyer/verify/documents" className="font-semibold underline underline-offset-2">
              uploading your proof of funds
            </Link>
            {' '}(+25 pts) and logging in daily to build your activity streak.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
