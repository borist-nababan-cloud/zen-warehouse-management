-- ================================================================
-- FIX RLS POLICIES FOR BARANG_PRICES, BARANG_UNITS, MASTER_BARANG
-- ================================================================

-- 1. Enable RLS
ALTER TABLE IF EXISTS public.barang_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.barang_units ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies (Drop before Create for Idempotency)
-- Drop old policy names to ensure clean slate
DROP POLICY IF EXISTS "Authenticated can read barang_prices" ON public.barang_prices;
DROP POLICY IF EXISTS "Authenticated can insert prices" ON public.barang_prices;
DROP POLICY IF EXISTS "Authenticated can update prices" ON public.barang_prices;

DROP POLICY IF EXISTS "Authenticated can read barang_units" ON public.barang_units;
DROP POLICY IF EXISTS "Authenticated can insert units" ON public.barang_units;
DROP POLICY IF EXISTS "Authenticated can update units" ON public.barang_units;

-- Drop legacy/other potential policy names
DROP POLICY IF EXISTS "Admin and Superuser can read all prices" ON public.barang_prices;
DROP POLICY IF EXISTS "Outlet users can read own outlet prices" ON public.barang_prices;
DROP POLICY IF EXISTS "Admin can insert prices" ON public.barang_prices;
DROP POLICY IF EXISTS "Outlet users can insert prices" ON public.barang_prices;
DROP POLICY IF EXISTS "Admin can update prices" ON public.barang_prices;
DROP POLICY IF EXISTS "Outlet users can update prices" ON public.barang_prices;

DROP POLICY IF EXISTS "Admin and Superuser can read all units" ON public.barang_units;
DROP POLICY IF EXISTS "Outlet users can read own outlet units" ON public.barang_units;
DROP POLICY IF EXISTS "Admin can insert units" ON public.barang_units;
DROP POLICY IF EXISTS "Outlet users can insert units" ON public.barang_units;
DROP POLICY IF EXISTS "Admin can update units" ON public.barang_units;
DROP POLICY IF EXISTS "Outlet users can update units" ON public.barang_units;

-- Remove old policy on master_barang
DROP POLICY IF EXISTS "Outlet users can read own outlet products" ON public.master_barang;
DROP POLICY IF EXISTS "Outlet users can read own outlet and holding products" ON public.master_barang;


-- 3. Create Policies for barang_prices

-- SELECT: Authenticated users can read
CREATE POLICY "Authenticated can read barang_prices"
ON public.barang_prices FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can insert for their own outlet or Holding
CREATE POLICY "Authenticated can insert prices"
ON public.barang_prices FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE users_profile.uid = auth.uid()
        AND (users_profile.kode_outlet = barang_prices.kode_outlet OR users_profile.user_role IN (1, 8)) 
    )
);

-- UPDATE: Users can update their own outlet
CREATE POLICY "Authenticated can update prices"
ON public.barang_prices FOR UPDATE
TO authenticated
USING (
     EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE users_profile.uid = auth.uid()
        AND (users_profile.kode_outlet = barang_prices.kode_outlet OR users_profile.user_role IN (1, 8))
    )
)
WITH CHECK (
     EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE users_profile.uid = auth.uid()
        AND (users_profile.kode_outlet = barang_prices.kode_outlet OR users_profile.user_role IN (1, 8))
    )
);


-- 4. Create Policies for barang_units

-- SELECT: Authenticated users can read
CREATE POLICY "Authenticated can read barang_units"
ON public.barang_units FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can insert for their own outlet
CREATE POLICY "Authenticated can insert units"
ON public.barang_units FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE users_profile.uid = auth.uid()
        AND (users_profile.kode_outlet = barang_units.kode_outlet OR users_profile.user_role IN (1, 8))
    )
);

-- UPDATE: Users can update their own outlet
CREATE POLICY "Authenticated can update units"
ON public.barang_units FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE users_profile.uid = auth.uid()
        AND (users_profile.kode_outlet = barang_units.kode_outlet OR users_profile.user_role IN (1, 8))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE users_profile.uid = auth.uid()
        AND (users_profile.kode_outlet = barang_units.kode_outlet OR users_profile.user_role IN (1, 8))
    )
);

-- 5. Update master_barang Policy
-- Allow users to see their own outlet items OR Holding items
CREATE POLICY "Outlet users can read own outlet and holding products"
ON public.master_barang FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users_profile
        WHERE users_profile.uid = auth.uid()
        AND (
            users_profile.kode_outlet = master_barang.kode_outlet
            OR master_barang.kode_outlet = '111'
            OR users_profile.user_role IN (1, 8) -- Admin/Superuser see all
        )
    )
);

-- 6. Clean up constraints if they exist
ALTER TABLE public.master_barang DROP CONSTRAINT IF EXISTS unique_sku_global;
