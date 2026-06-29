import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unarchiveProperty } from '@/app/buyer/knock/swipe-actions'

function formatPrice(p: number) {
  if (p >= 1_000_000) {
    const m = p / 1_000_000
    return '£' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'm'
  }
  return '£' + (p / 1000).toFixed(0) + 'k'
}

const gradients = {
  house: 'from-emerald-200 to-teal-300',
  flat: 'from-sky-200 to-blue-300',
  other: 'from-amber-200 to-orange-300',
}

export default async function ArchivedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: actions } = await supabase
    .from('buyer_property_actions')
    .select('property_id, created_at')
    .eq('profile_id', user!.id)
    .eq('action', 'archived')
    .order('created_at', { ascending: false })

  const propertyIds = actions?.map(a => a.property_id) ?? []

  let properties: Array<{
    id: string; address: string; postcode: string; price: number
    property_type: string; bedrooms: number
  }> = []

  if (propertyIds.length > 0) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('properties')
      .select('id, address, postcode, price, property_type, bedrooms')
      .in('id', propertyIds)
    properties = data ?? []
  }

  const orderedProperties = propertyIds
    .map(id => properties.find(p => p.id === id))
    .filter(Boolean) as typeof properties

  return (
    <div className="flex flex-col flex-1 px-4 pt-5">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-extrabold mb-0.5" style={{ color: '#3A7068' }}>Archived</h1>
        <p className="text-gray-400 text-sm">Properties you passed on</p>
      </div>

      {orderedProperties.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-6 h-6 text-gray-400">
              <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No archived properties yet.</p>
          <p className="text-gray-400 text-xs mt-1">Swipe left on a property to archive it.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-4 space-y-3">
          {orderedProperties.map(property => (
            <div key={property.id} className="bg-white/60 rounded-2xl overflow-hidden flex gap-0 opacity-75">
              <div className={`w-20 shrink-0 bg-gradient-to-br ${gradients[property.property_type as keyof typeof gradients] ?? gradients.other} flex items-center justify-center`}>
                <span className="text-white/60 text-2xl">
                  {property.property_type === 'house' ? '🏡' : property.property_type === 'flat' ? '🏢' : '🏗️'}
                </span>
              </div>
              <div className="flex-1 p-3 min-w-0">
                <p className="font-bold text-gray-700 text-sm leading-tight truncate">{property.address}</p>
                <p className="text-gray-400 text-xs">{property.postcode} · {property.bedrooms} bed</p>
                <p className="font-bold text-sm mt-1" style={{ color: '#3A7068' }}>{formatPrice(property.price)}</p>
              </div>
              <form action={async () => {
                'use server'
                await unarchiveProperty(property.id)
              }}>
                <button
                  type="submit"
                  className="h-full px-4 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors flex items-center"
                  title="Move back to feed"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-5" />
                  </svg>
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
