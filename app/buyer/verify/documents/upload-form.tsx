'use client'

import { useActionState } from 'react'
import { uploadDocument } from './actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const DOC_TYPES = [
  { value: 'proof_of_funds', label: 'Proof of funds (bank statement)' },
  { value: 'mortgage_in_principle', label: 'Mortgage in principle' },
  { value: 'employment_contract', label: 'Employment contract' },
]

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadDocument, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="doc_type">Document type</Label>
        <Select name="doc_type" required>
          <SelectTrigger id="doc_type">
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="file">File</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
          className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 transition-colors cursor-pointer"
        />
        <p className="text-xs text-gray-400">PDF, JPEG, or PNG · max 10 MB</p>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Uploading…' : 'Upload document'}
      </Button>
    </form>
  )
}
