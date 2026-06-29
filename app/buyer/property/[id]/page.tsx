import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BackButton } from '@/components/back-button'
import { knockFromDetail } from '@/app/buyer/knock/swipe-actions'

function formatPrice(p: number) {
  if (p >= 1_000_000) {
    const m = p / 1_000_000
    return '£' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'm'
  }
  return '£' + (p / 1_000).toFixed(0) + 'k'
}

const gradients = {
  house: 'from-emerald-300 via-teal-400 to-teal-600',
  flat:  'from-sky-300 via-blue-400 to-indigo-600',
  other: 'from-amber-300 via-orange-400 to-orange-600',
}

const typeIcons = {
  house: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 text-white/50">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  flat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 text-white/50">
      <rect x="1" y="3" width="15" height="18" />
      <path d="M16 8h4l3 3v10H16V8z" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 text-white/50">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const [{ data: property }, existingKnockResult] = await Promise.all([
    admin
      .from('properties')
      .select('id, address, postcode, price, property_type, bedrooms, description, property_images')
      .eq('id', id)
      .eq('status', 'active')
      .single(),
    supabase
      .from('knocks')
      .select('id, status')
      .eq('profile_id', user!.id)
      .eq('property_id', id)
      .order('knocked_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!property) notFound()

  const existingKnock = existingKnockResult.data
  const type = property.property_type as keyof typeof gradients
  const hasImages = property.property_images.length > 0

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: '#F5F0E8' }}>

      {/* ── Photo gallery ──────────────────────────────────────────── */}
      <div className="relative shrink-0 h-72 overflow-hidden">
        {hasImages ? (
          <div className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {property.property_images.map((url, i) => (
              <div key={i} className="w-full h-full shrink-0 snap-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradients[type] ?? gradients.other} flex items-center justify-center`}>
            {typeIcons[type] ?? typeIcons.other}
          </div>
        )}

        {/* Back button */}
        <BackButton />

        {/* Image count badge */}
        {hasImages && property.property_images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
            1 / {property.property_images.length}
          </div>
        )}

        {/* Placeholder label */}
        {!hasImages && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold text-white/70" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            No photos yet
          </div>
        )}
      </div>

      {/* ── Details ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28 space-y-5">

        {/* Error banner */}
        {errorParam && (
          <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-amber-800 text-sm">{decodeURIComponent(errorParam)}</p>
          </div>
        )}

        {/* Price + key facts */}
        <div>
          <p className="text-3xl font-extrabold" style={{ color: '#3A7068' }}>
            {formatPrice(property.price)}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: '#3A7068' }}>
              {property.bedrooms} bed
            </span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-white text-gray-700 capitalize">
              {property.property_type}
            </span>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Address</p>
          <p className="font-bold text-gray-900">{property.address}</p>
          <p className="text-gray-500 text-sm mt-0.5">{property.postcode}</p>
        </div>

        {/* Description */}
        {property.description && (
          <div className="bg-white rounded-2xl px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">About this property</p>
            <p className="text-gray-700 text-sm leading-relaxed">{property.description}</p>
          </div>
        )}

        {/* Already knocked — view status */}
        {existingKnock && (
          <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: '#3A706815', border: '1px solid #3A706830' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#3A7068' }}>
              {existingKnock.status === 'confirmed' ? '✓ Viewing confirmed' :
               existingKnock.status === 'expired'   ? 'Knock expired' :
               '⏳ Knock pending — waiting for agent'}
            </p>
            <Link
              href={`/buyer/knock/${existingKnock.id}`}
              className="text-sm font-bold underline underline-offset-2"
              style={{ color: '#3A7068' }}
            >
              View knock status →
            </Link>
          </div>
        )}

      </div>

      {/* ── Sticky Knock button ─────────────────────────────────────── */}
      {!existingKnock && (
        <div
          className="fixed bottom-16 left-0 right-0 px-4 py-3 border-t"
          style={{ backgroundColor: '#F5F0E8', borderColor: 'rgba(58,112,104,0.15)' }}
        >
          <form action={knockFromDetail.bind(null, property.id)}>
            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-extrabold text-white text-base tracking-wide shadow-md transition-opacity active:opacity-80 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#3A7068' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Knock
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
