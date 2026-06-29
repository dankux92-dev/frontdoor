import Link from 'next/link'

const steps = [
  { label: 'Documents', href: '/buyer/verify/documents' },
  { label: 'ID Check', href: '/buyer/verify/id' },
]

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/buyer/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Get verified</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete these steps to build your intent score and stand out to agents.
          </p>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {steps.map((step) => (
            <Link
              key={step.href}
              href={step.href}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 transition-all -mb-px"
            >
              {step.label}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  )
}
