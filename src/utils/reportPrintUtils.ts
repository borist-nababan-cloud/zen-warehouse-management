import { format } from 'date-fns'
import { MasterOutlet } from '@/types/database'
import { masterOutletService } from '@/services/masterOutletService'

export interface ReportPrintColumn {
    header: string
    align?: 'left' | 'center' | 'right'
    width?: string
}

export interface ReportPrintSummaryItem {
    label: string
    value: string
}

export interface ReportPrintOptions {
    title: string
    subtitle?: string
    /**
     * Whether the Outlet Dropdown is visible for this user (roles 5, 8, 13, 14)
     */
    canSelectOutlet: boolean
    /**
     * Currently selected outlet code ('ALL' or specific kode_outlet)
     */
    selectedOutlet: string
    /**
     * Fallback user's own kode_outlet when !canSelectOutlet
     */
    userOutletCode?: string | null
    /**
     * Optional cached list of outlets already loaded on the page
     */
    availableOutlets?: Partial<MasterOutlet>[]
    /**
     * Start date (YYYY-MM-DD or Date) - formatted as dd/MMM/yyyy
     */
    startDate?: string | Date | null
    /**
     * End date (YYYY-MM-DD or Date) - formatted as dd/MMM/yyyy
     */
    endDate?: string | Date | null
    /**
     * Status filter label to display in header (e.g., "Semua Status", "Lunas (PAID)")
     */
    statusLabel: string
    /**
     * Optional extra filter info (e.g. Account filter or Search term)
     */
    extraFilters?: { label: string; value: string }[]
    /**
     * Summary KPI items to display
     */
    summaryItems?: ReportPrintSummaryItem[]
    /**
     * Table column definitions
     */
    columns: ReportPrintColumn[]
    /**
     * Table rows (each row is an array of HTML/text cell values matching `columns`)
     */
    rows: (string | number)[][]
    /**
     * Optional footer/total row at the end of the table
     */
    totalRow?: (string | number)[]
    /**
     * Rows per A4 page (default: 22)
     */
    rowsPerPage?: number
}

/**
 * Format date string or Date object into dd/MMM/yyyy (e.g. 31/Oct/2026)
 */
export function formatReportPrintDate(dateInput?: string | Date | null): string {
    if (!dateInput) return '-'
    try {
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
        if (isNaN(d.getTime())) return String(dateInput)
        return format(d, 'dd/MMM/yyyy')
    } catch {
        return String(dateInput)
    }
}

/**
 * Resolve full MasterOutlet details for the print header
 */
async function resolveOutletHeaderData(
    canSelectOutlet: boolean,
    selectedOutlet: string,
    userOutletCode?: string | null,
    availableOutlets?: Partial<MasterOutlet>[]
): Promise<{ isAllOutlets: boolean; outlet: Partial<MasterOutlet> | null; fallbackCode: string }> {
    if (canSelectOutlet && (!selectedOutlet || selectedOutlet === 'ALL')) {
        return { isAllOutlets: true, outlet: null, fallbackCode: 'ALL OUTLET' }
    }

    const targetCode = (canSelectOutlet ? selectedOutlet : userOutletCode) || selectedOutlet || ''
    if (!targetCode || targetCode === 'ALL') {
        return { isAllOutlets: true, outlet: null, fallbackCode: 'ALL OUTLET' }
    }

    // Check if availableOutlets already has full details (alamat, city, no_telp, email)
    const cached = availableOutlets?.find((o) => o.kode_outlet === targetCode)
    if (cached && cached.name_outlet && cached.alamat !== undefined) {
        return { isAllOutlets: false, outlet: cached, fallbackCode: targetCode }
    }

    // Fetch full details from master_outlet table
    try {
        const fetched = await masterOutletService.getOutletByCode(targetCode)
        if (fetched) {
            return { isAllOutlets: false, outlet: fetched, fallbackCode: targetCode }
        }
    } catch (err) {
        console.warn('Could not fetch outlet detail for print header:', err)
    }

    return {
        isAllOutlets: false,
        outlet: cached || { kode_outlet: targetCode, name_outlet: targetCode },
        fallbackCode: targetCode,
    }
}

function escapeHtml(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return ''
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * Generates and opens an A4 multi-page printable report window with:
 * - Repeating Header on every page (Left: ZEN Icon + Title, Right: ALL OUTLET or master_outlet details, Filter dates dd/MMM/yyyy & Status)
 * - Detail Grid Table with repeating column headers
 * - Repeating Footer on every page with Page X of Y and Print Date/Time
 */
export async function printReportA4(options: ReportPrintOptions): Promise<void> {
    const {
        title,
        subtitle,
        canSelectOutlet,
        selectedOutlet,
        userOutletCode,
        availableOutlets,
        startDate,
        endDate,
        statusLabel,
        extraFilters = [],
        summaryItems = [],
        columns,
        rows,
        totalRow,
        rowsPerPage = 22,
    } = options

    const outletInfo = await resolveOutletHeaderData(
        canSelectOutlet,
        selectedOutlet,
        userOutletCode,
        availableOutlets
    )

    const iconUrl = `${window.location.origin}/assets/icon/icon-192x192.png`
    const printedAt = format(new Date(), 'dd/MMM/yyyy HH:mm:ss')

    const periodText =
        startDate && endDate
            ? `${formatReportPrintDate(startDate)} s/d ${formatReportPrintDate(endDate)}`
            : startDate
            ? formatReportPrintDate(startDate)
            : formatReportPrintDate(new Date())

    // Paginate rows so every A4 page has a deterministic repeating header and "Page X of Y" footer
    const rowChunks: (string | number)[][][] = []
    if (rows.length === 0) {
        rowChunks.push([])
    } else {
        for (let i = 0; i < rows.length; i += rowsPerPage) {
            rowChunks.push(rows.slice(i, i + rowsPerPage))
        }
    }
    const totalPages = rowChunks.length

    // Right Header HTML (ALL OUTLET vs specific master_outlet info)
    const rightHeaderHtml = outletInfo.isAllOutlets
        ? `
            <div class="outlet-box">
                <div class="outlet-badge">ALL OUTLET</div>
                <div class="outlet-sub">Seluruh Cabang / Gudang</div>
            </div>
        `
        : `
            <div class="outlet-box">
                <div class="outlet-name">${escapeHtml(outletInfo.outlet?.name_outlet || outletInfo.fallbackCode)}</div>
                ${outletInfo.outlet?.alamat ? `<div class="outlet-line">${escapeHtml(outletInfo.outlet.alamat)}</div>` : ''}
                ${outletInfo.outlet?.city ? `<div class="outlet-line">${escapeHtml(outletInfo.outlet.city)}</div>` : ''}
                ${outletInfo.outlet?.no_telp ? `<div class="outlet-line">Telp: ${escapeHtml(outletInfo.outlet.no_telp)}</div>` : ''}
                ${outletInfo.outlet?.email ? `<div class="outlet-line">Email: ${escapeHtml(outletInfo.outlet.email)}</div>` : ''}
            </div>
        `

    const extraFiltersHtml = extraFilters
        .filter((f) => f.value && f.value.trim() !== '')
        .map(
            (f) =>
                `<div class="meta-item"><span class="meta-label">${escapeHtml(f.label)}:</span> <span class="meta-val">${escapeHtml(f.value)}</span></div>`
        )
        .join('')

    const buildHeaderHtml = (pageIndex: number) => `
        <div class="report-header">
            <div class="header-top">
                <div class="header-left">
                    <img src="${iconUrl}" alt="ZEN Icon" class="brand-icon" />
                    <div class="title-block">
                        <h1 class="report-title">${escapeHtml(title)}</h1>
                        ${subtitle ? `<p class="report-subtitle">${escapeHtml(subtitle)}</p>` : ''}
                    </div>
                </div>
                <div class="header-right">
                    ${rightHeaderHtml}
                </div>
            </div>
            <div class="header-meta">
                <div class="meta-item">
                    <span class="meta-label">Periode Tanggal:</span>
                    <span class="meta-val">${escapeHtml(periodText)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Status Filter:</span>
                    <span class="meta-val">${escapeHtml(statusLabel)}</span>
                </div>
                ${extraFiltersHtml}
                <div class="meta-item">
                    <span class="meta-label">Total Baris:</span>
                    <span class="meta-val">${rows.length} Data</span>
                </div>
            </div>
            ${
                pageIndex === 0 && summaryItems.length > 0
                    ? `<div class="summary-strip">
                        ${summaryItems
                            .map(
                                (s) => `
                            <div class="summary-card">
                                <div class="summary-label">${escapeHtml(s.label)}</div>
                                <div class="summary-value">${escapeHtml(s.value)}</div>
                            </div>
                        `
                            )
                            .join('')}
                    </div>`
                    : ''
            }
        </div>
    `

    const tableColsHtml = columns
        .map(
            (col) =>
                `<th style="text-align: ${col.align || 'left'}; ${col.width ? `width: ${col.width};` : ''}">${escapeHtml(col.header)}</th>`
        )
        .join('')

    const pagesHtml = rowChunks
        .map((chunk, pageIndex) => {
            const isLastPage = pageIndex === totalPages - 1
            const bodyRowsHtml =
                chunk.length === 0
                    ? `<tr><td colspan="${columns.length}" style="text-align: center; padding: 24px; color: #64748b;">Tidak ada data untuk ditampilkan.</td></tr>`
                    : chunk
                          .map(
                              (row, rIdx) => `
                        <tr class="${rIdx % 2 === 1 ? 'row-alt' : ''}">
                            ${row
                                .map(
                                    (cell, cIdx) =>
                                        `<td style="text-align: ${columns[cIdx]?.align || 'left'};">${escapeHtml(cell)}</td>`
                                )
                                .join('')}
                        </tr>
                    `
                          )
                          .join('')

            const totalRowHtml =
                isLastPage && totalRow && totalRow.length > 0
                    ? `
                    <tr class="total-row">
                        ${totalRow
                            .map(
                                (cell, cIdx) =>
                                    `<td style="text-align: ${columns[cIdx]?.align || 'left'}; font-weight: 700;">${escapeHtml(cell)}</td>`
                            )
                            .join('')}
                    </tr>
                `
                    : ''

            return `
                <section class="print-page ${isLastPage ? 'last-page' : ''}">
                    <div class="page-body">
                        ${buildHeaderHtml(pageIndex)}
                        <table class="data-table">
                            <thead>
                                <tr>${tableColsHtml}</tr>
                            </thead>
                            <tbody>
                                ${bodyRowsHtml}
                                ${totalRowHtml}
                            </tbody>
                        </table>
                    </div>
                    <footer class="page-footer">
                        <div class="footer-left">Dicetak pada: ${escapeHtml(printedAt)}</div>
                        <div class="footer-right">Halaman ${pageIndex + 1} dari ${totalPages} (Page ${pageIndex + 1} of ${totalPages})</div>
                    </footer>
                </section>
            `
        })
        .join('')

    const printWindow = window.open('', '_blank', 'width=1024,height=800')
    if (!printWindow) {
        alert('Pop-up diblokir oleh browser. Mohon izinkan pop-up untuk mencetak laporan.')
        return
    }

    const htmlDocument = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #e2e8f0;
            font-size: 11px;
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
            padding: 10px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .toolbar-title {
            font-size: 14px;
            font-weight: 600;
        }
        .toolbar-actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            border: none;
            border-radius: 6px;
            padding: 7px 14px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-print {
            background: #10b981;
            color: #fff;
        }
        .btn-print:hover {
            background: #059669;
        }
        .btn-close {
            background: #475569;
            color: #fff;
        }
        .btn-close:hover {
            background: #334155;
        }
        .print-page {
            width: 210mm;
            min-height: 276mm;
            margin: 12px auto;
            padding: 10mm;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
        }
        .print-page.last-page {
            page-break-after: auto;
            break-after: auto;
        }
        .page-body {
            flex: 1;
        }
        .report-header {
            margin-bottom: 10px;
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 8px;
            gap: 16px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .brand-icon {
            width: 52px;
            height: 52px;
            object-fit: contain;
        }
        .report-title {
            font-size: 17px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: #0f172a;
        }
        .report-subtitle {
            font-size: 11px;
            color: #475569;
            margin-top: 2px;
        }
        .header-right {
            text-align: right;
            max-width: 48%;
        }
        .outlet-box {
            font-size: 10.5px;
            color: #1e293b;
        }
        .outlet-badge {
            display: inline-block;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.04em;
            border: 1.5px solid #0f172a;
            padding: 3px 10px;
            border-radius: 4px;
        }
        .outlet-sub {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
        }
        .outlet-name {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
        }
        .outlet-line {
            color: #334155;
            line-height: 1.3;
        }
        .header-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 8px;
            font-size: 10.5px;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .meta-label {
            font-weight: 600;
            color: #475569;
        }
        .meta-val {
            font-weight: 700;
            color: #0f172a;
        }
        .summary-strip {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        .summary-card {
            flex: 1;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 4px;
            padding: 6px 10px;
        }
        .summary-label {
            font-size: 9.5px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
        }
        .summary-value {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }
        .data-table thead {
            display: table-header-group;
        }
        .data-table th {
            background: #1e293b;
            color: #ffffff;
            font-weight: 700;
            padding: 6px 7px;
            border: 1px solid #1e293b;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }
        .data-table td {
            padding: 5px 7px;
            border: 1px solid #cbd5e1;
            color: #1e293b;
            vertical-align: top;
        }
        .data-table tr.row-alt td {
            background: #f8fafc;
        }
        .data-table tr.total-row td {
            background: #e2e8f0;
            border-top: 2px solid #0f172a;
            font-weight: 700;
            color: #0f172a;
            padding: 6px 7px;
        }
        .page-footer {
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px solid #94a3b8;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
            color: #475569;
            font-weight: 500;
        }
        @media print {
            body {
                background: #ffffff;
            }
            .toolbar {
                display: none !important;
            }
            .print-page {
                width: 100%;
                min-height: 274mm;
                margin: 0;
                padding: 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="toolbar-title">Pratinjau Cetak (A4) — ${escapeHtml(title)} (${totalPages} Halaman)</div>
        <div class="toolbar-actions">
            <button class="btn btn-print" onclick="window.print()">🖨️ Cetak Sekarang</button>
            <button class="btn btn-close" onclick="window.close()">Tutup</button>
        </div>
    </div>
    ${pagesHtml}
    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.print();
            }, 350);
        });
    </script>
</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(htmlDocument)
    printWindow.document.close()
}

