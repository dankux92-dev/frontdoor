import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SwipeDeck, type SwipeProperty } from '@/components/swipe-deck'

export default async function KnockSwipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get properties this user has already acted on
  const { data: actions } = await supabase
    .from('buyer_property_actions')
    .select('property_id')
    .eq('profile_id', user!.id)

  const actedPropertyIds = new Set(actions?.map(a => a.property_id) ?? [])

  const admin = createAdminClient()
  const { data: allProperties } = await admin
    .from('properties')
    .select('id, address, postcode, price, property_type, bedrooms, description')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const deck: SwipeProperty[] = (allProperties ?? [])
    .filter(p => !actedPropertyIds.has(p.id))
    .map(p => ({
      id: p.id,
      address: p.address,
      postcode: p.postcode,
      price: p.price,
      property_type: p.property_type as SwipeProperty['property_type'],
      bedrooms: p.bedrooms,
      description: p.description,
    }))

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-2 shrink-0">
        <h1 className="text-xl font-extrabold" style={{ color: '#3A7068' }}>Front Door</h1>
        <p className="text-gray-500 text-sm">Swipe to explore properties</p>
      </div>

      {/* Swipe hints */}
      <div className="px-5 pb-1 shrink-0">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="text-red-400 font-bold">←</span> Archive
          </span>
          <span className="flex items-center gap-1">
            <span className="text-green-500 font-bold">→</span> Save
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold" style={{ color: '#3A7068' }}>↑</span> Knock
          </span>
        </div>
      </div>

      <SwipeDeck properties={deck} />
    </div>
  )
}
