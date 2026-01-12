
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase Env Vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const PO_ID = '99089afb-e861-4548-badd-9f4e39394726'

async function debugPO() {
  console.log(`Debugging PO: ${PO_ID}`)

  // 1. Fetch PO
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', PO_ID)
    .single()
  
  if (poError) {
    console.error('PO Error:', poError)
    return
  }
  console.log('PO Header:', {
    doc: po.document_number,
    status: po.status,
    total_amount: po.total_amount
  })

  // 2. Fetch PO Items
  const { data: poItems, error: itemsError } = await supabase
    .from('purchase_order_items')
    .select('*')
    .eq('po_id', PO_ID)
  
  if (itemsError) console.error(itemsError)
  
  console.log(`\nPO Items (${poItems?.length}):`)
  poItems?.forEach(i => {
    console.log(`- Item [${i.barang_id}] | Ordered: ${i.qty_ordered} | Received (DB): ${i.qty_received}`)
  })

  // 3. Fetch GRs for this PO
  const { data: grs, error: grError } = await supabase
    .from('goods_receipts')
    .select('*, goods_receipt_items(*)')
    .eq('po_id', PO_ID)
  
  if (grError) console.error(grError)

  console.log(`\nGoods Receipts (${grs?.length}):`)
  
  // Calculate Actual Sum from GRs
  const calculatedReceived = new Map<string, number>() // po_item_id -> total

  grs?.forEach(gr => {
    console.log(`> GR [${gr.document_number}] Created: ${gr.received_at}`)
    gr.goods_receipt_items?.forEach((gri: any) => {
      console.log(`  - GR Item [${gri.barang_id}] Qty: ${gri.qty_received}`)
      
      const current = calculatedReceived.get(gri.po_item_id) || 0
      calculatedReceived.set(gri.po_item_id, current + Number(gri.qty_received))
    })
  })

  // Compare
  console.log('\n--- DISCREPANCY CHECK ---')
  poItems?.forEach(poi => {
    const sumFromGR = calculatedReceived.get(poi.id) || 0
    const dbValue = Number(poi.qty_received)
    const diff = dbValue - sumFromGR
    
    console.log(`Item [${poi.id}]`)
    console.log(`   Ordered: ${poi.qty_ordered}`)
    console.log(`   Sum of GRs: ${sumFromGR}`)
    console.log(`   PO Item DB: ${dbValue}`)
    
    if (diff !== 0) {
        console.error(`   ❌ DISCREPANCY: DB is higher by ${diff} (Double Count?)`)
    } else {
        console.log(`   ✅ MATCH`)
    }
  })

}

debugPO()
