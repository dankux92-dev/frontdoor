ALTER TABLE public.properties
  ADD COLUMN property_images TEXT[] NOT NULL DEFAULT '{}';
