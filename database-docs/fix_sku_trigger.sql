-- FIX FOR 409 CONFLICT ON PRODUCT CREATION
-- The current trigger often fails because it cannot see products from other outlets/users due to RLS.
-- This causes it to generate a duplicate SKU (e.g. ZP25XII0005) that already exists but is hidden.
-- Solution: Make the trigger function SECURITY DEFINER so it runs with admin privileges and sees ALL products.

-- 1. Drop existing trigger (optional but good practice to be clean)
DROP TRIGGER IF EXISTS set_sku_before_insert ON public.master_barang;

-- 2. Update the function to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION generate_sku_trigger()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_sku TEXT;
  year_suffix TEXT;
  month_roman TEXT;
  last_sequence INT;
  seq_str TEXT;
  prefix_pattern TEXT;
BEGIN
  -- Defensive: If SKU is already set, do nothing
  IF NEW.sku IS NOT NULL AND NEW.sku <> '' THEN
    RETURN NEW;
  END IF;

  -- 1. Get Date Parts
  -- Year suffix (e.g., '25' for 2025)
  year_suffix := to_char(now(), 'YY');
  
  -- Month Roman
  SELECT get_roman_month(EXTRACT(MONTH FROM now())::INT) INTO month_roman;

  -- 2. Construct Prefix Pattern for Search
  -- Format: ZP + KODE_OUTLET + YY + ROMAN
  -- Example: ZP10925XII
  prefix_pattern := 'ZP' || NEW.kode_outlet || year_suffix || month_roman;

  -- 3. Get Last Sequence
  -- Lock ID 1001 for concurrency safety
  PERFORM pg_advisory_xact_lock(1001);

  SELECT 
    COALESCE(
      MAX(
        -- Robustly extract last 4 digits regardless of prefix length
        CAST(RIGHT(sku, 4) AS INTEGER)
      ), 
      0
    )
  INTO last_sequence
  FROM master_barang
  WHERE sku LIKE prefix_pattern || '%';

  -- 4. Generate New Sequence
  last_sequence := last_sequence + 1;
  seq_str := lpad(last_sequence::TEXT, 4, '0');

  -- 5. Construct SKU
  new_sku := prefix_pattern || seq_str;

  NEW.sku := new_sku;
  
  RETURN NEW;
END;
$$;

-- 3. Re-create Trigger
CREATE TRIGGER set_sku_before_insert
BEFORE INSERT ON public.master_barang
FOR EACH ROW
WHEN (NEW.sku IS NULL OR NEW.sku = '')
EXECUTE FUNCTION generate_sku_trigger();
