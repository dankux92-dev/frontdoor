import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { KnockStatus } from '@/components/knock-status'

function formatPrice(p: number) {
  if (p >= 1_000_000) {
    const m = p / 1_000_000
    return '£' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'm'
  }
  return '£' + (p / 1000).toFixed(0) + 'k'
}

export default async function KnockedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: knocks } = await supabase
    .from('knocks')
    .select('id, property_address, property_postcode, property_id, status, knocked_at, expires_at, confirmed_at')
    .eq('profile_id', user!.id)
    .order('knocked_at', { ascending: false })

  // Fetch property details for knocks that have a property_id
  const propertyIds = [...new Set(knocks?.map(k => k.property_id).filter(Boolean) as string[])]
  let propertyMap = new Map<string, { price: number; property_type: string; bedrooms: number }>()

  if (propertyIds.length > 0) {
    const admin = createAdminClient()
    const { data: properties } = await admin
      .from('properties')
      .select('id, price, property_type, bedrooms')
      .in('id', propertyIds)

    properties?.forEach(p => propertyMap.set(p.id, p))
  }

  return (
    <div className="flex flex-col flex-1 px-4 pt-5">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-extrabold mb-0.5" style={{ color: '#3A7068' }}>Knocked</h1>
        <p className="text-gray-400 text-sm">Your viewing requests</p>
      </div>

      {!knocks?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-6 h-6 text-gray-400">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No knocks yet.</p>
          <p className="text-gray-400 text-xs mt-1">Swipe up on a property to request a viewing.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-4 space-y-3">
          {knocks.map(knock => {
            const prop = knock.property_id ? propertyMap.get(knock.property_id) : null

            return (
              <div key={knock.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 leading-tight">{knock.property_address}</p>
                    <p className="text-gray-400 text-sm">{knock.property_postcode}</p>
                    {prop && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {prop.bedrooms} bed · {prop.property_type} · {formatPrice(prop.price)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={knock.status} />
                </div>

                {knock.status === 'pending' && (
                  <div className="mt-3">
                    <KnockStatus knock={knock} compact />
                  </div>
                )}

                {knock.status === 'confirmed' && (
                  <p className="text-sm mt-2" style={{ color: '#3A7068' }}>
                    ✓ Viewing confirmed
                    {knock.confirmed_at && (
                      <span className="text-gray-400 text-xs ml-1">
                        · {new Date(knock.confirmed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </p>
                )}

                {knock.status === 'expired' && (
                  <p className="text-gray-400 text-sm mt-2">The agent didn&apos;t respond in time.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') return (
    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: '#3A7068' }}>
      Pending
    </span>
  )
  if (status === 'confirmed') return (
    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
      Confirmed
    </span>
  )
  return (
    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
      Expired
    </span>
  )
}
