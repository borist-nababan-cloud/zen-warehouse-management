import { format } from 'date-fns'
import type { StockCardResponse } from '@/services/stockCardService'

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatQty(val: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(val || 0))
}

function formatDateOnly(dateInput?: string | null): string {
  if (!dateInput) return '-'
  try {
    const d = new Date(`${dateInput.slice(0, 10)}T00:00:00`)
    if (isNaN(d.getTime())) return String(dateInput)
    return format(d, 'dd/MMM/yyyy')
  } catch {
    return String(dateInput)
  }
}

function formatDateTimeWib(tsInput?: string | null): string {
  if (!tsInput) return '-'
  try {
    const d = new Date(tsInput)
    if (isNaN(d.getTime())) return String(tsInput)
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return String(tsInput)
  }
}

const STOCK_CARD_A5_LANDSCAPE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page {
    size: A5 landscape;
    margin: 7mm;
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #e2e8f0;
    font-size: 9px;
    line-height: 1.32;
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
    width: 210mm;
    min-height: 147mm;
    margin: 12px auto;
    background: #fff;
    padding: 7mm;
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
    padding-bottom: 6px;
    margin-bottom: 7px;
  }
  .brand-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    max-width: 58%;
  }
  .brand-logo {
    width: 32px;
    height: 32px;
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
    color: #1e293b;
  }
  .outlet-meta {
    font-size: 8px;
    color: #64748b;
  }
  .doc-right {
    text-align: right;
  }
  .status-pill {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 8px;
    font-weight: 700;
    margin-top: 3px;
  }
  .status-ok {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  }
  .status-warn {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }
  .item-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: #F8F5F1;
    border: 1px solid #D2C0A7;
    border-radius: 5px;
    padding: 6px 8px;
    margin-bottom: 7px;
  }
  .item-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .item-thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 5px;
    border: 1px solid #D2C0A7;
    background: #fff;
    flex-shrink: 0;
  }
  .item-sku {
    font-family: Consolas, monospace;
    font-size: 8.5px;
    font-weight: 700;
    color: #6E8027;
  }
  .item-name {
    font-size: 11px;
    font-weight: 800;
    color: #3C3C32;
  }
  .item-metrics {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
    text-align: right;
  }
  .metric-box {
    border-left: 1px solid #D2C0A7;
    padding-left: 10px;
  }
  .metric-label {
    font-size: 7.5px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
  }
  .metric-val {
    font-size: 10.5px;
    font-weight: 800;
    color: #1e293b;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;
  }
  table.data-table thead {
    display: table-header-group;
  }
  table.data-table th {
    background: #3C3C32;
    color: #F8F5F1;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 5px 6px;
    text-align: left;
    border: 1px solid #3C3C32;
  }
  table.data-table td {
    padding: 4.5px 6px;
    border: 1px solid #e2e8f0;
    font-size: 8.5px;
    vertical-align: top;
  }
  table.data-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .row-opening {
    background: #F8F5F1;
    font-weight: 700;
  }
  .row-total td {
    background: #f1f5f9;
    font-weight: 800;
    border-top: 1.5px solid #3C3C32;
  }
  .qty-in { color: #15803d; font-weight: 700; }
  .qty-out { color: #b91c1c; font-weight: 700; }
  .anom-tag {
    display: inline-block;
    margin-left: 4px;
    padding: 0 4px;
    border-radius: 3px;
    background: #fee2e2;
    color: #991b1b;
    font-size: 7.5px;
    font-weight: 700;
  }
  .doc-footer {
    border-top: 1px dashed #cbd5e1;
    padding-top: 5px;
    margin-top: 6px;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #64748b;
  }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .a5-sheet {
      width: 100%;
      min-height: auto;
      margin: 0;
      padding: 0;
      box-shadow: none;
    }
  }
`

export function printStockCardA5(data: StockCardResponse, printedByName: string): void {
  const iconUrl = `${window.location.origin}/assets/icon/icon-192x192.png`
  const printedAt = format(new Date(), 'dd/MMM/yyyy HH:mm:ss')
  const { item, outlet, filter, summary, rows } = data

  const periodeLabel =
    filter.mode === 'RANGE'
      ? `${formatDateOnly(filter.start_date)} s/d ${formatDateOnly(filter.end_date || format(new Date(), 'yyyy-MM-dd'))}`
      : 'Dari Saldo Awal (Semua Riwayat)'

  const productImg = item.image1_url || item.image2_url || ''
  const discrepancySign = summary.discrepancy > 0 ? '+' : ''
  const reconciliationBadge = summary.is_balanced
    ? `<div class="status-pill status-ok">✓ Seimbang (Sistem: ${escapeHtml(formatQty(summary.system_qty_on_hand))} ${escapeHtml(item.uom)})</div>`
    : `<div class="status-pill status-warn">⚠ Anomali Selisih: ${discrepancySign}${escapeHtml(formatQty(summary.discrepancy))} ${escapeHtml(item.uom)} (Sistem: ${escapeHtml(formatQty(summary.system_qty_on_hand))})</div>`

  const openingRowHtml = `
    <tr class="row-opening">
      <td style="text-align: center; width: 24px;">-</td>
      <td style="width: 96px; white-space: nowrap;">${escapeHtml(formatDateOnly(summary.opening_date))}</td>
      <td>${escapeHtml(summary.opening_label)}</td>
      <td style="text-align: right; width: 56px;">-</td>
      <td style="text-align: right; width: 56px;">-</td>
      <td style="text-align: right; width: 64px; font-weight: 800;">${escapeHtml(formatQty(summary.opening_balance))}</td>
    </tr>
  `

  const rowsHtml = rows
    .map((r, idx) => {
      const inDisplay = r.in_qty > 0 ? `+${formatQty(r.in_qty)}` : '-'
      const outDisplay = r.out_qty > 0 ? `-${formatQty(r.out_qty)}` : '-'
      const anomTag = r.has_opname_mismatch
        ? `<span class="anom-tag">[Anomali Opname: Saldo Kartu ${escapeHtml(formatQty(r.balance_before))} ≠ Sistem ${escapeHtml(formatQty(r.opname_system_qty))}]</span>`
        : ''
      return `
        <tr>
          <td style="text-align: center; width: 24px;">${idx + 1}</td>
          <td style="width: 96px; white-space: nowrap;">${escapeHtml(formatDateTimeWib(r.event_ts))}</td>
          <td>${escapeHtml(r.description)}${anomTag}</td>
          <td style="text-align: right; width: 56px;" class="${r.in_qty > 0 ? 'qty-in' : ''}">${escapeHtml(inDisplay)}</td>
          <td style="text-align: right; width: 56px;" class="${r.out_qty > 0 ? 'qty-out' : ''}">${escapeHtml(outDisplay)}</td>
          <td style="text-align: right; width: 64px; font-weight: 700;">${escapeHtml(formatQty(r.balance))}</td>
        </tr>
      `
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Kartu Stok - ${escapeHtml(item.sku)} (${escapeHtml(outlet.kode_outlet)})</title>
  <style>${STOCK_CARD_A5_LANDSCAPE_STYLES}</style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">Pratinjau Cetak Kartu Stok (A5 Landscape) — ${escapeHtml(item.sku)} • ${escapeHtml(item.name)}</div>
    <div class="toolbar-actions">
      <button class="btn btn-print" onclick="window.print()">Cetak (A5 Landscape)</button>
      <button class="btn btn-close" onclick="window.close()">Tutup</button>
    </div>
  </div>
  <div class="a5-sheet">
    <div>
      <div class="doc-header">
        <div class="brand-row">
          <img src="${iconUrl}" alt="Zen Logo" class="brand-logo" onerror="this.style.display='none'" />
          <div>
            <div class="doc-title">KARTU STOK (MUTASI PERSEDIAAN)</div>
            <div class="outlet-name">[${escapeHtml(outlet.kode_outlet)}] ${escapeHtml(outlet.name_outlet)}</div>
            ${outlet.alamat ? `<div class="outlet-meta">${escapeHtml(outlet.alamat)}${outlet.city ? `, ${escapeHtml(outlet.city)}` : ''}</div>` : ''}
            ${outlet.no_telp ? `<div class="outlet-meta">Telp: ${escapeHtml(outlet.no_telp)}</div>` : ''}
          </div>
        </div>
        <div class="doc-right">
          <div style="font-size: 8.5px; color: #475569;"><strong>Periode:</strong> ${escapeHtml(periodeLabel)}</div>
          <div style="font-size: 8.5px; color: #475569;"><strong>Total Baris Mutasi:</strong> ${rows.length} transaksi</div>
          ${reconciliationBadge}
        </div>
      </div>

      <div class="item-card">
        <div class="item-left">
          ${productImg ? `<img src="${escapeHtml(productImg)}" alt="${escapeHtml(item.name)}" class="item-thumb" onerror="this.style.display='none'" />` : ''}
          <div>
            <div class="item-sku">SKU: ${escapeHtml(item.sku)} • Satuan: ${escapeHtml(item.uom)}</div>
            <div class="item-name">${escapeHtml(item.name)}</div>
          </div>
        </div>
        <div class="item-metrics">
          <div class="metric-box">
            <div class="metric-label">Saldo Awal</div>
            <div class="metric-val">${escapeHtml(formatQty(summary.opening_balance))}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Masuk (+)</div>
            <div class="metric-val" style="color: #15803d;">+${escapeHtml(formatQty(summary.total_in))}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Keluar (-)</div>
            <div class="metric-val" style="color: #b91c1c;">-${escapeHtml(formatQty(summary.total_out))}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Saldo Akhir</div>
            <div class="metric-val" style="color: #6E8027;">${escapeHtml(formatQty(summary.closing_balance))}</div>
          </div>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align: center; width: 24px;">No</th>
            <th style="width: 96px;">Tanggal (WIB)</th>
            <th>Deskripsi (Sumber &amp; Dokumen)</th>
            <th style="text-align: right; width: 56px;">Masuk</th>
            <th style="text-align: right; width: 56px;">Keluar</th>
            <th style="text-align: right; width: 64px;">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${openingRowHtml}
          ${rowsHtml}
          <tr class="row-total">
            <td colspan="3" style="text-align: right;">TOTAL MUTASI PERIODE (${escapeHtml(item.uom)})</td>
            <td style="text-align: right; color: #15803d;">+${escapeHtml(formatQty(summary.total_in))}</td>
            <td style="text-align: right; color: #b91c1c;">-${escapeHtml(formatQty(summary.total_out))}</td>
            <td style="text-align: right; color: #6E8027;">${escapeHtml(formatQty(summary.closing_balance))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="doc-footer">
      <div>Dicetak oleh: <strong>${escapeHtml(printedByName)}</strong> pada ${escapeHtml(printedAt)}</div>
      <div>Zen Family Spa &amp; Reflexology • Warehouse Management System</div>
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=980,height=720')
  if (!win) {
    alert('Popup diblokir browser. Izinkan popup untuk menampilkan pratinjau cetak Kartu Stok A5.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
