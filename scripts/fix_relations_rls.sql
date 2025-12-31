
-- Enable RLS just in case (good practice, though might be already enabled without policies)
ALTER TABLE IF EXISTS public.master_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.master_outlet ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated can read master_type" ON public.master_type;
DROP POLICY IF EXISTS "Authenticated can read master_outlet" ON public.master_outlet;

-- Create READ policies for Authenticated users
-- master_type is usually valid for everyone
CREATE POLICY "Authenticated can read master_type"
ON public.master_type FOR SELECT
TO authenticated
USING (true);

-- master_outlet is usually valid for everyone (to see outlet names)
CREATE POLICY "Authenticated can read master_outlet"
ON public.master_outlet FOR SELECT
TO authenticated
USING (true);
