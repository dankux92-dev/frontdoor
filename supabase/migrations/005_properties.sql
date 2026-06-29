-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  postcode TEXT NOT NULL,
  price INTEGER NOT NULL,  -- in whole pounds
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'flat', 'other')),
  bedrooms INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'let')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active properties"
  ON public.properties FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

-- Buyer property actions (swipe deck state)
CREATE TABLE public.buyer_property_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('archived', 'saved', 'knocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, property_id)
);

CREATE INDEX buyer_property_actions_profile_idx ON public.buyer_property_actions(profile_id, action);

ALTER TABLE public.buyer_property_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own property actions"
  ON public.buyer_property_actions FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Add property_id to knocks so swipe-based knocks can link back to the property
ALTER TABLE public.knocks
  ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- Seed: 10 placeholder properties across London postcodes
INSERT INTO public.properties (address, postcode, price, property_type, bedrooms, description) VALUES
  ('14 Eaton Square',                    'SW1W 9BH', 2850000, 'flat',  3, 'Stunning period conversion in the heart of Belgravia. High ceilings, original features, private parking.'),
  ('7 Barnsbury Street',                 'N1 1PN',    725000, 'house', 3, 'Charming Victorian terraced house on a quiet Islington street. Recently renovated throughout.'),
  ('23 Whitechapel Road',                'E1 1DU',    385000, 'flat',  1, 'Modern one-bedroom apartment with excellent transport links. Open plan living, private balcony.'),
  ('42 Devonshire Road',                 'W4 2HD',   1350000, 'house', 4, 'Exceptional family home in Chiswick. Large garden, double garage, close to top-rated schools.'),
  ('9 Bermondsey Street',                'SE1 3UH',   545000, 'flat',  2, 'Contemporary two-bedroom apartment in vibrant Bermondsey. Exposed brickwork, roof terrace access.'),
  ('18 Fitzjohn''s Avenue',              'NW3 5NA',  1650000, 'house', 5, 'Impressive detached home in prime Hampstead. South-facing garden, original Victorian architecture.'),
  ('88 Harbour Exchange Square',         'E14 9GE',   420000, 'flat',  1, 'Smart one-bedroom apartment with Docklands views. Concierge, gym, and underground parking included.'),
  ('3 Exmouth Market',                   'EC1R 4QE',  680000, 'flat',  2, 'Stylish Clerkenwell apartment on iconic Exmouth Market. Warehouse conversion with exposed beams.'),
  ('56 Lower Richmond Road',             'SW15 1ET',  895000, 'house', 3, 'Attractive Victorian terrace in Putney. Recently extended kitchen, large rear garden, quiet street.'),
  ('29 Stoke Newington Church Street',   'N16 0NX',   520000, 'flat',  2, 'Period conversion in desirable Stoke Newington. High ceilings, original fireplaces, private courtyard.');
