const pg = require('pg');
const { Client } = pg;

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  database: 'postgres',
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
});

async function fixTrigger() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected! Fixing auto_post_ap_ledger function...');

    // Redefine the function to fetch missing columns from purchase_orders
    const query = `
      CREATE OR REPLACE FUNCTION "public"."auto_post_ap_ledger"()
      RETURNS "pg_catalog"."trigger" AS $BODY$
      DECLARE
        v_kode_supplier uuid;
        v_kode_outlet text;
      BEGIN
        -- Fetch missing info from PO
        SELECT kode_supplier, kode_outlet INTO v_kode_supplier, v_kode_outlet
        FROM public.purchase_orders
        WHERE id = NEW.purchase_order_id; 
        
        -- Insert into the Ledger automatically using data from the new Invoice and fetched PO data
        INSERT INTO public.finance_ap_ledger (
            invoice_id,
            kode_supplier,
            kode_outlet,
            original_amount,
            paid_amount,
            due_date,
            is_paid
        ) VALUES (
            NEW.id,               -- The ID of the invoice just created
            v_kode_supplier,      -- Fetched from PO
            v_kode_outlet,        -- Fetched from PO
            NEW.total_amount,     -- The debt amount
            0,                    -- Paid starts at 0
            NEW.payment_due_date, -- Copied from invoice
            FALSE
        );

        RETURN NEW;
      END;
      $BODY$
      LANGUAGE plpgsql VOLATILE
      COST 100;
    `;

    await client.query(query);
    console.log('✓ Function auto_post_ap_ledger updated successfully.');

  } catch (err) {
    console.error('Error updating function:', err);
  } finally {
    await client.end();
  }
}

fixTrigger();
