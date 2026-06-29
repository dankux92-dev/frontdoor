import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()

  const admin = createAdminClient()
  let propertyQuery = admin
    .from('properties')
    .select('id, address, postcode, price, property_type, bedrooms, description')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (query) {
    propertyQuery = propertyQuery.or(
      `address.ilike.%${query}%,postcode.ilike.%${query}%`
    )
  }

  const { data: properties } = await propertyQuery

  return (
    <div className="flex flex-col flex-1 px-4 pt-5">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-extrabold mb-3" style={{ color: '#3A7068' }}>Search</h1>
        <form method="GET" action="/buyer/search">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by address or postcode…"
              className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white border-0 shadow-sm text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 font-medium"
              style={{ '--tw-ring-color': '#3A7068' } as React.CSSProperties}
            />
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-4">
        {query && (
          <p className="text-xs text-gray-400 mb-3">
            {properties?.length ?? 0} result{properties?.length === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
          </p>
        )}

        {!query && (
          <p className="text-xs text-gray-400 mb-3">Showing all available properties</p>
        )}

        {properties?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No properties found{query ? ` for "${query}"` : ''}.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {properties?.map(property => (
            <Link key={property.id} href={`/buyer/property/${property.id}`} className="block bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
              <div className={`h-28 bg-gradient-to-br ${gradients[property.property_type as keyof typeof gradients] ?? gradients.other} flex items-center justify-center`}>
                <span className="text-white/60 text-4xl">
                  {property.property_type === 'house' ? '🏡' : property.property_type === 'flat' ? '🏢' : '🏗️'}
                </span>
              </div>
              <div className="p-3">
                <p className="font-bold text-gray-900 text-sm leading-tight">{property.address}</p>
                <p className="text-gray-400 text-xs mt-0.5">{property.postcode}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-extrabold text-sm" style={{ color: '#3A7068' }}>{formatPrice(property.price)}</span>
                  <span className="text-xs text-gray-400">{property.bedrooms} bed · {property.property_type}</span>
                </div>
                {property.description && (
                  <p className="text-gray-500 text-xs mt-1.5 line-clamp-2">{property.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
