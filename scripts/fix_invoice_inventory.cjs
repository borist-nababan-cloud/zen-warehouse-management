const pg = require('pg');
const { Client } = pg;

const client = new Client({
  host: '217.21.78.155',
  port: 57777,
  database: 'postgres',
  user: 'postgres',
  password: '6eMmeCxaATl8z7be3ReaGodvN7HpcOpt',
});

async function applyFixes() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected! Applying fixes...');

    // 1. Fix generate_purchase_invoice to use ACTUAL (Received) total
    console.log('Fixing generate_purchase_invoice...');
    await client.query(`
      CREATE OR REPLACE FUNCTION "public"."generate_purchase_invoice"("target_po_id" uuid, "supplier_inv_ref" text, "payment_due_date" date, "user_id" uuid)
      RETURNS "pg_catalog"."numeric" AS $BODY$
      DECLARE
          v_total_amount numeric;
          v_po_status public.po_status;
          v_kode_supplier uuid;
          v_kode_outlet text;
          new_invoice_doc text; 
      BEGIN
          -- Calculate Total from RECEIVED items (Safety Check)
          SELECT COALESCE(SUM(qty_received * price_per_unit), 0)
          INTO v_total_amount
          FROM public.purchase_order_items
          WHERE po_id = target_po_id;

          -- Fetch other PO details
          SELECT status, kode_supplier, kode_outlet 
          INTO v_po_status, v_kode_supplier, v_kode_outlet
          FROM public.purchase_orders
          WHERE id = target_po_id;

          IF v_po_status IS NULL THEN
              RAISE EXCEPTION 'Purchase Order not found';
          END IF;
          
          -- Generate Document Number
          new_invoice_doc := 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || substring(cast(target_po_id as text), 1, 4);

          -- Create Invoice Record
          INSERT INTO public.purchase_invoices (
              document_number,
              purchase_order_id,
              supplier_invoice_number,
              payment_due_date,
              total_amount,
              status,
              created_by
          ) VALUES (
              new_invoice_doc, 
              target_po_id,
              supplier_inv_ref,
              payment_due_date,
              v_total_amount,
              'UNPAID',
              user_id
          );

          -- Update PO Status to INVOICED
          UPDATE public.purchase_orders
          SET status = 'INVOICED'
          WHERE id = target_po_id;

          RETURN v_total_amount;
      END;
      $BODY$
      LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
    `);
    console.log('✓ generate_purchase_invoice updated.');

    // 2. Fix update_inventory_on_receipt to handle missing inventory rows (UPSERT)
    console.log('Fixing update_inventory_on_receipt...');
    await client.query(`
      CREATE OR REPLACE FUNCTION "public"."update_inventory_on_receipt"()
      RETURNS "pg_catalog"."trigger" AS $BODY$
      DECLARE
        target_outlet TEXT;
      BEGIN
        -- 1. Find the Outlet Code from the Receipt Header
        SELECT kode_outlet INTO target_outlet 
        FROM public.goods_receipts 
        WHERE id = NEW.receipt_id;

        -- 2. Upsert Inventory Balance
        -- Handles case where item might not exist in that outlet yet
        INSERT INTO public.inventory_balance (barang_id, kode_outlet, qty_on_hand, opening_balance, last_movement_at, date_ob)
        VALUES (NEW.barang_id, target_outlet, NEW.qty_base_unit, 0, NOW(), CURRENT_DATE)
        ON CONFLICT (barang_id, kode_outlet) DO UPDATE SET
            -- If exists, add to qty_on_hand
            qty_on_hand = inventory_balance.qty_on_hand + EXCLUDED.qty_on_hand,
            last_movement_at = NOW(),
            -- Set date_ob if it was somehow NULL
            date_ob = COALESCE(inventory_balance.date_ob, EXCLUDED.date_ob);

        -- 3. Update the Purchase Order Item (Track fulfillment)
        UPDATE public.purchase_order_items
        SET qty_received = qty_received + NEW.qty_received
        WHERE id = NEW.po_item_id;

        RETURN NEW;
      END;
      $BODY$
      LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
    `);
    console.log('✓ update_inventory_on_receipt updated.');

    console.log('All fixes applied successfully.');

  } catch (err) {
    console.error('Error applying fixes:', err);
  } finally {
    await client.end();
  }
}

applyFixes();
