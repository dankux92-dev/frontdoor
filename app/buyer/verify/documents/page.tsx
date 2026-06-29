import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadForm } from './upload-form'

function fileLabel(path: string) {
  // path: userId/1234567890-filename.pdf  →  filename.pdf
  return path.split('/').pop()?.replace(/^\d+-/, '') ?? path
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: verification } = await supabase
    .from('verifications')
    .select('docs_url, income_verified, status')
    .eq('profile_id', user!.id)
    .single()

  const docs = verification?.docs_url ?? []

  return (
    <div className="space-y-6">
      {/* What to upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload your documents</CardTitle>
          <CardDescription>
            One of the following is enough to earn your +25 points. All files are stored
            securely and only shared with agents you engage with.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
            <li>Mortgage in principle (MIP) from a lender</li>
            <li>Bank statement or proof of funds showing your deposit</li>
            <li>Employment contract (for rental applications)</li>
          </ul>

          <UploadForm />
        </CardContent>
      </Card>

      {/* Uploaded docs */}
      {docs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded documents</CardTitle>
            <CardDescription>
              {verification?.income_verified
                ? 'Your documents have been verified.'
                : 'Under review — we\'ll notify you once verified.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {docs.map((path) => (
                <li key={path} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-gray-700 font-medium">{fileLabel(path)}</span>
                  {verification?.income_verified ? (
                    <span className="text-green-600 text-xs font-medium">✓ Verified</span>
                  ) : (
                    <span className="text-amber-600 text-xs font-medium">⏳ Pending</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
