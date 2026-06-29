import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We&apos;ve sent you a confirmation link. Click it to activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Once confirmed you&apos;ll be taken straight to your dashboard. If you don&apos;t see
          the email, check your spam folder.
        </p>
        <p className="text-sm text-gray-500">
          To skip email confirmation during development, go to your Supabase dashboard →{' '}
          <strong>Authentication → Settings</strong> and disable &ldquo;Enable email
          confirmations&rdquo;.
        </p>
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  )
}
