import { format } from 'date-fns'
import { CstSalesOrder } from '@/types/database'

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateId(dateInput?: string | Date | null): string {
  if (!dateInput) return '-'
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return String(dateInput)
    return format(d, 'dd/MMM/yyyy')
  } catch {
    return String(dateInput)
  }
}

function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)
}

function formatQty(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val || 0)
}

const SHARED_A5_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page {
    size: A5 portrait;
    margin: 7mm;
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #e2e8f0;
    font-size: 9.5px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #1e293b;
    color: #fff;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
  .toolbar-title { font-size: 13px; font-weight: 600; }
  .toolbar-actions { display: flex; gap: 8px; }
  .btn {
    border: none;
    border-radius: 5px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-print { background: #889D35; color: #fff; }
  .btn-close { background: #475569; color: #fff; }
  .a5-sheet {
    width: 148mm;
    min-height: 209mm;
    margin: 12px auto;
    background: #fff;
    padding: 8mm;
    box-shadow: 0 4px 18px rgba(0,0,0,0.14);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #3C3C32;
    padding-bottom: 7px;
    margin-bottom: 8px;
  }
  .brand-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    max-width: 56%;
  }
  .brand-logo {
    width: 34px;
    height: 34px;
    object-fit: contain;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    padding: 2px;
    flex-shrink: 0;
  }
  .doc-title {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.6px;
    color: #3C3C32;
    text-transform: uppercase;
  }
  .outlet-name {
    font-size: 10px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 2px;
  }
  .outlet-meta {
    font-size: 8.5px;
    color: #475569;
  }
  .doc-meta {
    text-align: right;
    font-size: 8.8px;
  }
  .doc-meta table {
    margin-left: auto;
    border-collapse: collapse;
  }
  .doc-meta td {
    padding: 1px 0 1px 8px;
  }
  .doc-meta td:first-child {
    color: #64748b;
    font-weight: 600;
    text-align: right;
  }
  .doc-meta td:last-child {
    font-weight: 700;
    color: #0f172a;
  }
  .customer-box {
    background: #F8F5F1;
    border: 1px solid #D2C0A7;
    border-radius: 5px;
    padding: 6px 9px;
    margin-bottom: 8px;
  }
  .customer-box-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    color: #6E8027;
    margin-bottom: 2px;
  }
  .customer-name {
    font-size: 10.5px;
    font-weight: 700;
    color: #1e293b;
  }
  .customer-info {
    font-size: 8.5px;
    color: #475569;
  }
  table.items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  table.items-table th {
    background: #3C3C32;
    color: #fff;
    padding: 4.5px 6px;
    font-size: 8.5px;
    font-weight: 700;
    text-transform: uppercase;
  }
  table.items-table td {
    padding: 4.5px 6px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 9px;
    vertical-align: top;
  }
  table.items-table tr:nth-child(even) td {
    background: #fafafa;
  }
  .sku-sub {
    font-size: 7.8px;
    color: #64748b;
    font-family: monospace;
  }
  .summary-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
    margin-bottom: 8px;
  }
  .summary-table {
    width: 58%;
    border-collapse: collapse;
  }
  .summary-table td {
    padding: 2.5px 4px;
    font-size: 9px;
  }
  .summary-table td:first-child {
    color: #475569;
  }
  .summary-table td:last-child {
    text-align: right;
    font-weight: 600;
    font-family: monospace;
  }
  .summary-table tr.grand-total td {
    border-top: 1.5px solid #3C3C32;
    border-bottom: 1.5px solid #3C3C32;
    padding-top: 4px;
    padding-bottom: 4px;
    font-size: 10.5px;
    font-weight: 800;
    color: #0f172a;
    background: #F8F5F1;
  }
  .notes-box {
    font-size: 8.5px;
    color: #475569;
    margin-bottom: 8px;
    border-left: 2px solid #D2C0A7;
    padding-left: 6px;
  }
  .signatures {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .sig-col {
    flex: 1;
    text-align: center;
  }
  .sig-title {
    font-size: 9px;
    font-weight: 700;
    color: #334155;
    margin-bottom: 36px;
  }
  .sig-line {
    font-size: 9.5px;
    font-weight: 600;
    color: #0f172a;
    letter-spacing: 0.5px;
  }
  .doc-footer {
    border-top: 1px dashed #cbd5e1;
    padding-top: 5px;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #475569;
  }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .a5-sheet {
      width: 100%;
      min-height: calc(210mm - 14mm);
      margin: 0;
      padding: 0;
      box-shadow: none;
    }
  }
`

function openPrintPopup(htmlDocument: string) {
  const win = window.open('', '_blank', 'width=820,height=760')
  if (!win) {
    alert('Pop-up diblokir oleh browser. Mohon izinkan pop-up untuk mencetak dokumen A5.')
    return
  }
  win.document.open()
  win.document.write(htmlDocument)
  win.document.close()
}

/**
 * Cetak Surat Jalan ukuran A5 (setengah A4):
 * - Hanya menampilkan kuantitas (tanpa harga)
 * - 3 kolom tanda tangan kosong "_____________": Penerima, Pengirim, Mengetahui
 * - Footer bawah: Dicetak oleh (users_profile.full_name)
 */
export function printSuratJalanA5(order: CstSalesOrder, printedByName: string): void {
  const shipment = order.cst_shipments?.[0]
  if (!shipment) {
    alert('Dokumen pengiriman (Surat Jalan) belum tersedia untuk pesanan ini.')
    return
  }

  const iconUrl = `${window.location.origin}/assets/icon/icon-192x192.png`
  const printedAt = format(new Date(), 'dd/MMM/yyyy HH:mm:ss')

  const uomBySoItem = new Map<string, string>()
  ;(order.cst_sales_order_items || []).forEach((item) => {
    uomBySoItem.set(item.id, item.uom || 'PCS')
  })

  const shipItems = shipment.cst_shipment_items || []
  const rowsHtml = shipItems
    .map((item, idx) => {
      const uom = uomBySoItem.get(item.so_item_id) || 'PCS'
      return `
        <tr>
          <td style="text-align: center; width: 26px;">${idx + 1}</td>
          <td style="width: 78px;"><span class="sku-sub">${escapeHtml(item.master_barang?.sku || '-')}</span></td>
          <td><strong>${escapeHtml(item.master_barang?.name || '-')}</strong></td>
          <td style="text-align: right; font-weight: 700; width: 58px;">${escapeHtml(formatQty(item.qty_shipped))}</td>
          <td style="text-align: center; width: 52px;">${escapeHtml(uom)}</td>
        </tr>
      `
    })
    .join('')

  const totalQty = shipItems.reduce((sum, i) => sum + Number(i.qty_shipped || 0), 0)

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Surat Jalan - ${escapeHtml(shipment.document_number)}</title>
  <style>${SHARED_A5_STYLES}</style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">Pratinjau Cetak Surat Jalan (A5) — ${escapeHtml(shipment.document_number)}</div>
    <div class="toolbar-actions">
      <button class="btn btn-print" onclick="window.print()">Cetak (A5)</button>
      <button class="btn btn-close" onclick="window.close()">Tutup</button>
    </div>
  </div>
  <div class="a5-sheet">
    <div>
      <div class="doc-header">
        <div class="brand-row">
          <img src="${iconUrl}" alt="Zen Logo" class="brand-logo" onerror="this.style.display='none'" />
          <div>
            <div class="doc-title">Surat Jalan</div>
            <div class="outlet-name">${escapeHtml(order.master_outlet?.name_outlet || order.kode_outlet)}</div>
            ${order.master_outlet?.alamat ? `<div class="outlet-meta">${escapeHtml(order.master_outlet.alamat)}</div>` : ''}
            ${order.master_outlet?.city ? `<div class="outlet-meta">${escapeHtml(order.master_outlet.city)}</div>` : ''}
            ${order.master_outlet?.no_telp ? `<div class="outlet-meta">Telp: ${escapeHtml(order.master_outlet.no_telp)}</div>` : ''}
          </div>
        </div>
        <div class="doc-meta">
          <table>
            <tbody>
              <tr><td>No. Surat Jalan:</td><td>${escapeHtml(shipment.document_number)}</td></tr>
              <tr><td>No. Pesanan:</td><td>${escapeHtml(order.document_number)}</td></tr>
              <tr><td>Tgl Kirim:</td><td>${escapeHtml(formatDateId(shipment.shipment_date))}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="customer-box">
        <div class="customer-box-label">Dikirim Kepada (Customer)</div>
        <div class="customer-name">${escapeHtml(order.master_customer?.name || '-')}</div>
        <div class="customer-info">
          ${escapeHtml(order.master_customer?.address || '-')}${order.master_customer?.city ? `, ${escapeHtml(order.master_customer.city)}` : ''}
          ${order.master_customer?.phone ? ` • Telp: ${escapeHtml(order.master_customer.phone)}` : ''}
        </div>
        ${
          order.master_customer?.pic_name || order.master_customer?.pic_phone
            ? `<div class="customer-info">PIC: ${escapeHtml(order.master_customer?.pic_name || '-')}${
                order.master_customer?.pic_phone ? ` (${escapeHtml(order.master_customer.pic_phone)})` : ''
              }</div>`
            : ''
        }
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: center;">No</th>
            <th style="text-align: left;">SKU</th>
            <th style="text-align: left;">Nama Barang</th>
            <th style="text-align: right;">Qty</th>
            <th style="text-align: center;">Satuan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="5" style="text-align:center;padding:12px;">Tidak ada item pengiriman.</td></tr>'}
          <tr style="background:#F8F5F1;font-weight:700;">
            <td colspan="3" style="text-align:right;">Total Kuantitas Dikirim</td>
            <td style="text-align:right;">${escapeHtml(formatQty(totalQty))}</td>
            <td style="text-align:center;">Item</td>
          </tr>
        </tbody>
      </table>

      ${
        shipment.notes || order.notes
          ? `<div class="notes-box"><strong>Catatan:</strong> ${escapeHtml(shipment.notes || order.notes || '')}</div>`
          : ''
      }
    </div>

    <div>
      <div class="signatures">
        <div class="sig-col">
          <div class="sig-title">Penerima</div>
          <div class="sig-line">_____________</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Pengirim</div>
          <div class="sig-line">_____________</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Mengetahui</div>
          <div class="sig-line">_____________</div>
        </div>
      </div>

      <div class="doc-footer">
        <div>Dicetak oleh: <strong>${escapeHtml(printedByName)}</strong></div>
        <div>${escapeHtml(printedAt)}</div>
      </div>
    </div>
  </div>
</body>
</html>`

  openPrintPopup(html)
}

/**
 * Cetak Faktur Penjualan ukuran A5 (setengah A4):
 * - Menghitung berdasarkan qty kirim aktual
 * - Baris pajak hanya muncul jika use_tax === true
 * - 2 kolom tanda tangan kosong "_____________": Dibuat Oleh, Mengetahui
 * - Footer bawah: Dicetak oleh (users_profile.full_name)
 */
export function printFakturPenjualanA5(order: CstSalesOrder, printedByName: string): void {
  const invoice = order.cst_invoices?.[0]
  if (!invoice) {
    alert('Faktur Penjualan belum diterbitkan untuk pesanan ini.')
    return
  }

  const shipment = order.cst_shipments?.[0]
  const iconUrl = `${window.location.origin}/assets/icon/icon-192x192.png`
  const printedAt = format(new Date(), 'dd/MMM/yyyy HH:mm:ss')

  const soItemMap = new Map<string, { price: number; uom: string; name: string; sku: string }>()
  ;(order.cst_sales_order_items || []).forEach((item) => {
    soItemMap.set(item.id, {
      price: Number(item.price_per_unit || 0),
      uom: item.uom || 'PCS',
      name: item.master_barang?.name || '-',
      sku: item.master_barang?.sku || '-',
    })
  })

  const shipItems = shipment?.cst_shipment_items || []
  const lineRowsHtml =
    shipItems.length > 0
      ? shipItems
          .map((sItem, idx) => {
            const meta = soItemMap.get(sItem.so_item_id)
            const unitPrice = meta?.price ?? 0
            const qty = Number(sItem.qty_shipped || 0)
            const lineSubtotal = Math.round((qty * unitPrice + Number.EPSILON) * 100) / 100
            return `
              <tr>
                <td style="text-align: center; width: 24px;">${idx + 1}</td>
                <td>
                  <strong>${escapeHtml(sItem.master_barang?.name || meta?.name || '-')}</strong>
                  <div class="sku-sub">${escapeHtml(sItem.master_barang?.sku || meta?.sku || '-')}</div>
                </td>
                <td style="text-align: right; width: 42px;">${escapeHtml(formatQty(qty))}</td>
                <td style="text-align: center; width: 42px;">${escapeHtml(meta?.uom || 'PCS')}</td>
                <td style="text-align: right; width: 78px;">${escapeHtml(formatRupiah(unitPrice))}</td>
                <td style="text-align: right; width: 84px; font-weight: 600;">${escapeHtml(formatRupiah(lineSubtotal))}</td>
              </tr>
            `
          })
          .join('')
      : (order.cst_sales_order_items || [])
          .map(
            (item, idx) => `
          <tr>
            <td style="text-align: center; width: 24px;">${idx + 1}</td>
            <td>
              <strong>${escapeHtml(item.master_barang?.name || '-')}</strong>
              <div class="sku-sub">${escapeHtml(item.master_barang?.sku || '-')}</div>
            </td>
            <td style="text-align: right; width: 42px;">${escapeHtml(formatQty(item.qty_ordered))}</td>
            <td style="text-align: center; width: 42px;">${escapeHtml(item.uom || 'PCS')}</td>
            <td style="text-align: right; width: 78px;">${escapeHtml(formatRupiah(item.price_per_unit))}</td>
            <td style="text-align: right; width: 84px; font-weight: 600;">${escapeHtml(formatRupiah(item.subtotal))}</td>
          </tr>
        `
          )
          .join('')

  const taxRowHtml = invoice.use_tax
    ? `
      <tr>
        <td>Pajak (PPN ${escapeHtml(Number(invoice.tax_percent || 0))}%)</td>
        <td>${escapeHtml(formatRupiah(invoice.tax_amount))}</td>
      </tr>
    `
    : ''

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Faktur Penjualan - ${escapeHtml(invoice.document_number)}</title>
  <style>${SHARED_A5_STYLES}</style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">Pratinjau Cetak Faktur Penjualan (A5) — ${escapeHtml(invoice.document_number)}</div>
    <div class="toolbar-actions">
      <button class="btn btn-print" onclick="window.print()">Cetak (A5)</button>
      <button class="btn btn-close" onclick="window.close()">Tutup</button>
    </div>
  </div>
  <div class="a5-sheet">
    <div>
      <div class="doc-header">
        <div class="brand-row">
          <img src="${iconUrl}" alt="Zen Logo" class="brand-logo" onerror="this.style.display='none'" />
          <div>
            <div class="doc-title">Faktur Penjualan</div>
            <div class="outlet-name">${escapeHtml(order.master_outlet?.name_outlet || order.kode_outlet)}</div>
            ${order.master_outlet?.alamat ? `<div class="outlet-meta">${escapeHtml(order.master_outlet.alamat)}</div>` : ''}
            ${order.master_outlet?.city ? `<div class="outlet-meta">${escapeHtml(order.master_outlet.city)}</div>` : ''}
            ${order.master_outlet?.no_telp ? `<div class="outlet-meta">Telp: ${escapeHtml(order.master_outlet.no_telp)}</div>` : ''}
          </div>
        </div>
        <div class="doc-meta">
          <table>
            <tbody>
              <tr><td>No. Faktur:</td><td>${escapeHtml(invoice.document_number)}</td></tr>
              <tr><td>No. Pesanan:</td><td>${escapeHtml(order.document_number)}</td></tr>
              ${shipment ? `<tr><td>No. Surat Jalan:</td><td>${escapeHtml(shipment.document_number)}</td></tr>` : ''}
              <tr><td>Tgl Faktur:</td><td>${escapeHtml(formatDateId(invoice.invoice_date))}</td></tr>
              <tr><td>Jatuh Tempo:</td><td>${escapeHtml(formatDateId(invoice.due_date))}</td></tr>
              <tr><td>Status:</td><td>${invoice.payment_status === 'PAID' ? 'LUNAS (PAID)' : 'BELUM LUNAS'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="customer-box">
        <div class="customer-box-label">Ditagihkan Kepada (Customer)</div>
        <div class="customer-name">${escapeHtml(order.master_customer?.name || '-')}</div>
        <div class="customer-info">
          ${escapeHtml(order.master_customer?.address || '-')}${order.master_customer?.city ? `, ${escapeHtml(order.master_customer.city)}` : ''}
          ${order.master_customer?.phone ? ` • Telp: ${escapeHtml(order.master_customer.phone)}` : ''}
        </div>
        ${
          order.master_customer?.pic_name || order.master_customer?.pic_phone
            ? `<div class="customer-info">PIC: ${escapeHtml(order.master_customer?.pic_name || '-')}${
                order.master_customer?.pic_phone ? ` (${escapeHtml(order.master_customer.pic_phone)})` : ''
              }</div>`
            : ''
        }
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: center;">No</th>
            <th style="text-align: left;">Barang / Produk</th>
            <th style="text-align: right;">Qty</th>
            <th style="text-align: center;">Sat</th>
            <th style="text-align: right;">Harga</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${lineRowsHtml}
        </tbody>
      </table>

      <div class="summary-wrap">
        <table class="summary-table">
          <tbody>
            <tr>
              <td>Subtotal Barang Aktual</td>
              <td>${escapeHtml(formatRupiah(invoice.subtotal_items))}</td>
            </tr>
            <tr>
              <td>Diskon</td>
              <td>- ${escapeHtml(formatRupiah(invoice.discount_amount))}</td>
            </tr>
            ${taxRowHtml}
            <tr>
              <td>Ongkos Kirim</td>
              <td>${escapeHtml(formatRupiah(invoice.shipping_cost))}</td>
            </tr>
            <tr class="grand-total">
              <td>Total Tagihan</td>
              <td>${escapeHtml(formatRupiah(invoice.grand_total))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${
        invoice.notes
          ? `<div class="notes-box"><strong>Catatan:</strong> ${escapeHtml(invoice.notes)}</div>`
          : ''
      }
    </div>

    <div>
      <div class="signatures">
        <div class="sig-col">
          <div class="sig-title">Dibuat Oleh</div>
          <div class="sig-line">_____________</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Mengetahui</div>
          <div class="sig-line">_____________</div>
        </div>
      </div>

      <div class="doc-footer">
        <div>Dicetak oleh: <strong>${escapeHtml(printedByName)}</strong></div>
        <div>${escapeHtml(printedAt)}</div>
      </div>
    </div>
  </div>
</body>
</html>`

  openPrintPopup(html)
}
