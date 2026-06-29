export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Front Door</h1>
          <p className="text-sm text-gray-500 mt-1">Verified buyers and renters for UK agents</p>
        </div>
        {children}
      </div>
    </div>
  )
}
