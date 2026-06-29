import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { knockPropertyFromSaved } from '@/app/buyer/knock/swipe-actions'

function formatPrice(p: number) {
  if (p >= 1_000_000) {
    const m = p / 1_000_000
    return '£' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'm'
  }
  return '£' + (p / 1000).toFixed(0) + 'k'
}

const gradients = {
  house: 'from-emerald-300 to-teal-500',
  flat: 'from-sky-300 to-blue-500',
  other: 'from-amber-300 to-orange-500',
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: actions } = await supabase
    .from('buyer_property_actions')
    .select('property_id, created_at')
    .eq('profile_id', user!.id)
    .eq('action', 'saved')
    .order('created_at', { ascending: false })

  const propertyIds = actions?.map(a => a.property_id) ?? []

  let properties: Array<{
    id: string; address: string; postcode: string; price: number
    property_type: string; bedrooms: number; description: string | null
  }> = []

  if (propertyIds.length > 0) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('properties')
      .select('id, address, postcode, price, property_type, bedrooms, description')
      .in('id', propertyIds)
    properties = data ?? []
  }

  const orderedProperties = propertyIds
    .map(id => properties.find(p => p.id === id))
    .filter(Boolean) as typeof properties

  return (
    <div className="flex flex-col flex-1 px-4 pt-5">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-extrabold mb-0.5" style={{ color: '#3A7068' }}>Saved</h1>
        <p className="text-gray-400 text-sm">Properties you liked</p>
      </div>

      {errorParam && (
        <div className="mb-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 shrink-0">
          <p className="text-amber-800 text-sm">{decodeURIComponent(errorParam)}</p>
        </div>
      )}

      {orderedProperties.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-6 h-6 text-gray-400">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No saved properties yet.</p>
          <p className="text-gray-400 text-xs mt-1">Swipe right on a property to save it.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-4 space-y-3">
          {orderedProperties.map(property => (
            <div key={property.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className={`h-28 bg-gradient-to-br ${gradients[property.property_type as keyof typeof gradients] ?? gradients.other} flex items-center justify-center relative`}>
                <span className="text-white/60 text-4xl">
                  {property.property_type === 'house' ? '🏡' : property.property_type === 'flat' ? '🏢' : '🏗️'}
                </span>
                <span className="absolute top-2 right-2 bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {property.property_type}
                </span>
              </div>
              <div className="p-4">
                <p className="font-bold text-gray-900 leading-tight">{property.address}</p>
                <p className="text-gray-400 text-sm mt-0.5">{property.postcode} · {property.bedrooms} bed</p>
                {property.description && (
                  <p className="text-gray-500 text-sm mt-1.5 line-clamp-2">{property.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="font-extrabold text-lg" style={{ color: '#3A7068' }}>{formatPrice(property.price)}</span>
                  <form action={async () => {
                    'use server'
                    await knockPropertyFromSaved(property.id)
                  }}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-opacity active:opacity-80"
                      style={{ backgroundColor: '#3A7068' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      Knock
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
