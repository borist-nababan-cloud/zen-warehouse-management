import { format } from 'date-fns'
import { MasterOutlet } from '@/types/database'
import { masterOutletService } from '@/services/masterOutletService'
import {
    HrdReportTr,
    HrdReportTrDetail,
    HrdTrFault,
    HrdReportKpi,
    HrdReportKpiDetail,
    HrdKpiFault,
} from '@/types/hrd'

export interface ReportPrintColumn {
    header: string
    align?: 'left' | 'center' | 'right'
    width?: string
}

export interface ReportPrintSummaryItem {
    label: string
    value: string
}

export interface ReportPrintSignature {
    title: string
    name: string
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
     * Optional signatures block on the last page
     */
    signatures?: ReportPrintSignature[]
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
        signatures = [],
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

            const signaturesHtml = isLastPage && signatures && signatures.length > 0
                ? `
                    <div class="report-signatures" style="margin-top: 25px; margin-bottom: 12px; display: flex; justify-content: space-between; page-break-inside: avoid;">
                        ${signatures.map(s => `
                            <div style="width: 22%; text-align: center; font-size: 10px; color: #1e293b;">
                                <div style="font-weight: 600; margin-bottom: 45px; text-transform: uppercase; font-size: 9.5px; color: #475569;">${escapeHtml(s.title)}</div>
                                <div style="font-weight: 700; border-bottom: 1px solid #0f172a; padding-bottom: 3px; min-height: 18px;">${escapeHtml(s.name)}</div>
                            </div>
                        `).join('')}
                    </div>
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
                        ${signaturesHtml}
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

export interface TherapistEvaluationPrintOptions {
    report: HrdReportTr
    details: HrdReportTrDetail[]
    faults: HrdTrFault[]
    evaluatorName?: string | null
    availableOutlets?: Partial<MasterOutlet>[]
    periodDates?: { startDate: string; endDate: string } | null
}

export interface EmployeeKpiEvaluationPrintOptions {
    report: HrdReportKpi
    details: HrdReportKpiDetail[]
    faults: HrdKpiFault[]
    evaluatorName?: string | null
    availableOutlets?: Partial<MasterOutlet>[]
    periodDates?: { startDate: string; endDate: string } | null
}

interface EvaluationPrintLabels {
    docTitlePrefix: string
    toolbarLabel: string
    headerTitle: string
    headerSubtitle: string
    sectionVarsTitle: string
    sectionFaultsTitle: string
    nilFaultsText: string
    nilDeductionText: string
    subjectSigTitle: string
    footerText: string
    deptFallback: string
}

async function printIndividualEvaluationSheetA4(
    options: {
        report: HrdReportTr | HrdReportKpi
        details: (HrdReportTrDetail | HrdReportKpiDetail)[]
        faults: (HrdTrFault | HrdKpiFault)[]
        evaluatorName?: string | null
        availableOutlets?: Partial<MasterOutlet>[]
        periodDates?: { startDate: string; endDate: string } | null
    },
    labels: EvaluationPrintLabels
): Promise<void> {
    const { report, details, faults, evaluatorName, availableOutlets, periodDates } = options

    const outletInfo = await resolveOutletHeaderData(
        false,
        report.kode_outlet,
        report.kode_outlet,
        availableOutlets
    )

    const iconUrl = `${window.location.origin}/assets/icon/icon-192x192.png`
    const printedAt = format(new Date(), 'dd/MMM/yyyy HH:mm:ss')

    const periodText = periodDates?.startDate && periodDates?.endDate
        ? `${formatReportPrintDate(periodDates.startDate)} s/d ${formatReportPrintDate(periodDates.endDate)}`
        : report.payrollperiode || formatReportPrintDate(report.tanggal_report)

    const finalScore = Number(report.nilai_total) || 0
    let predikatText = 'Cukup'
    let scoreColor = '#d97706'
    if (finalScore >= 8.5) {
        predikatText = 'Sangat Baik (A)'
        scoreColor = '#15803d'
    } else if (finalScore >= 7.0) {
        predikatText = 'Baik (B)'
        scoreColor = '#2563eb'
    } else if (finalScore < 5.0) {
        predikatText = 'Kurang / Perlu Pembinaan (D)'
        scoreColor = '#b91c1c'
    }

    const employeeDept =
        ('departemen' in report ? report.departemen : undefined) ||
        report.karyawan_info?.departemen ||
        labels.deptFallback

    const subjectPhotoHtml = report.karyawan_info?.foto_url
        ? `<img src="${report.karyawan_info.foto_url}" alt="${escapeHtml(report.karyawan_info?.namakaryawan || '')}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #889D35; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`
        : `<div style="width: 64px; height: 64px; border-radius: 50%; background: #F8F5F1; border: 2px solid #D2C0A7; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #889D35;">
            ${(report.karyawan_info?.namakaryawan || report.kodekaryawan || labels.deptFallback).substring(0, 2).toUpperCase()}
           </div>`

    // Group details by category
    const groupedDetails: Record<string, (HrdReportTrDetail | HrdReportKpiDetail)[]> = {}
    details.forEach((det) => {
        const cat = det.nama_kategori || 'Variabel Penilaian'
        if (!groupedDetails[cat]) groupedDetails[cat] = []
        groupedDetails[cat].push(det)
    })

    const detailsRowsHtml = Object.entries(groupedDetails).map(([catName, items]) => {
        const itemsHtml = items.map((it) => `
            <tr>
                <td style="padding: 5px 8px; font-weight: 500;">${escapeHtml(it.nama_variable)}</td>
                <td style="padding: 5px 8px; text-align: center; font-weight: 700; color: #1e293b;">${escapeHtml(it.nilai_variable)} / 10</td>
                <td style="padding: 5px 8px; color: #475569; font-style: ${it.catatan_variable ? 'normal' : 'italic'};">
                    ${it.catatan_variable ? escapeHtml(it.catatan_variable) : '-'}
                </td>
            </tr>
        `).join('')

        return `
            <tr style="background: #f1f5f9;">
                <td colspan="3" style="padding: 6px 8px; font-weight: 700; font-size: 10.5px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                    📁 ${escapeHtml(catName)} (${items.length} Variabel)
                </td>
            </tr>
            ${itemsHtml}
        `
    }).join('')

    const faultsRowsHtml = faults.length > 0
        ? faults.map((f, idx) => `
            <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
                <td style="padding: 5px 8px; text-align: center;">${formatReportPrintDate(f.tanggal)}</td>
                <td style="padding: 5px 8px; font-weight: 600;">${escapeHtml(f.nama_faults)}</td>
                <td style="padding: 5px 8px; text-align: center;">
                    <span style="font-weight: 600; font-size: 10px; color: ${f.kategori === 'Berat' ? '#b91c1c' : f.kategori === 'Sedang' ? '#d97706' : '#15803d'};">
                        ${escapeHtml(f.kategori)}
                    </span>
                </td>
                <td style="padding: 5px 8px; text-align: center; font-weight: 700; color: #b91c1c;">
                    -${escapeHtml(f.pengurang || 0)}
                </td>
                <td style="padding: 5px 8px; color: #475569;">
                    ${f.keterangan ? escapeHtml(f.keterangan) : '-'}
                </td>
            </tr>
        `).join('')
        : ''

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
            </div>
        `

    const printWindow = window.open('', '_blank', 'width=1024,height=800')
    if (!printWindow) {
        alert('Pop-up diblokir oleh browser. Mohon izinkan pop-up untuk mencetak lembar evaluasi.')
        return
    }

    const htmlDocument = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(labels.docTitlePrefix)} - ${escapeHtml(report.kode_report)}</title>
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
            font-size: 10.5px;
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
        }
        .page-body {
            flex: 1;
        }
        .report-header {
            margin-bottom: 12px;
            border-bottom: 2px solid #889D35;
            padding-bottom: 8px;
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .brand-icon {
            width: 44px;
            height: 44px;
            object-fit: contain;
        }
        .report-title {
            font-size: 16px;
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .report-subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 1px;
        }
        .outlet-box {
            text-align: right;
            font-size: 10px;
            color: #475569;
            max-width: 280px;
        }
        .outlet-name {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
        }
        .outlet-badge {
            display: inline-block;
            background: #10b981;
            color: #fff;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
        }
        .outlet-sub {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
        }
        .header-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 10px;
        }
        .meta-item {
            display: flex;
            gap: 4px;
        }
        .meta-label {
            color: #64748b;
            font-weight: 600;
        }
        .meta-val {
            color: #0f172a;
            font-weight: 700;
        }
        .therapist-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #f8fafc;
            margin-bottom: 12px;
        }
        .therapist-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .score-box {
            text-align: right;
            border-left: 2px solid #e2e8f0;
            padding-left: 14px;
        }
        .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 10px 0 6px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 10px;
        }
        .data-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            font-size: 9.5px;
        }
        .data-table td {
            border: 1px solid #cbd5e1;
            color: #1e293b;
            vertical-align: middle;
        }
        .data-table tr.row-alt td {
            background: #f8fafc;
        }
        .page-footer {
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px solid #94a3b8;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
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
        <div class="toolbar-title">${escapeHtml(labels.toolbarLabel)} — ${escapeHtml(report.karyawan_info?.namakaryawan || report.kodekaryawan)}</div>
        <div class="toolbar-actions">
            <button class="btn btn-print" onclick="window.print()">🖨️ Cetak Lembar Ini</button>
            <button class="btn btn-close" onclick="window.close()">Tutup</button>
        </div>
    </div>
    <section class="print-page">
        <div class="page-body">
            <!-- Header -->
            <div class="report-header">
                <div class="header-top">
                    <div class="header-left">
                        <img src="${iconUrl}" alt="ZEN Icon" class="brand-icon" />
                        <div>
                            <h1 class="report-title">${escapeHtml(labels.headerTitle)}</h1>
                            <p class="report-subtitle">${escapeHtml(labels.headerSubtitle)}</p>
                        </div>
                    </div>
                    <div class="header-right">
                        ${rightHeaderHtml}
                    </div>
                </div>
                <div class="header-meta">
                    <div class="meta-item"><span class="meta-label">No. Dokumen:</span> <span class="meta-val">${escapeHtml(report.kode_report)}</span></div>
                    <div class="meta-item"><span class="meta-label">Tanggal Evaluasi:</span> <span class="meta-val">${formatReportPrintDate(report.tanggal_report)}</span></div>
                    <div class="meta-item"><span class="meta-label">Periode Payroll:</span> <span class="meta-val">${escapeHtml(report.payrollperiode || '-')}</span></div>
                    <div class="meta-item"><span class="meta-label">Rentang Evaluasi:</span> <span class="meta-val">${escapeHtml(periodText)}</span></div>
                    <div class="meta-item"><span class="meta-label">Evaluator:</span> <span class="meta-val">${escapeHtml(report.update_by_name || evaluatorName || 'Evaluator Cabang')}</span></div>
                </div>
            </div>

            <!-- Subject Identity Card -->
            <div class="therapist-card">
                <div class="therapist-info">
                    ${subjectPhotoHtml}
                    <div>
                        <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${escapeHtml(report.karyawan_info?.namakaryawan || report.kodekaryawan)}</div>
                        <div style="font-size: 10px; color: #475569; margin-top: 2px;">
                            ID Karyawan: <strong>${escapeHtml(report.karyawan_info?.idkaryawan || '-')}</strong> | Kode: <strong>${escapeHtml(report.kodekaryawan)}</strong> | Dept: <strong>${escapeHtml(employeeDept)}</strong>
                        </div>
                        <div style="font-size: 10px; color: #475569; margin-top: 1px;">
                            Penempatan: <strong>[${escapeHtml(report.kode_outlet)}] ${escapeHtml(report.master_outlet?.name_outlet || '')}</strong>
                        </div>
                    </div>
                </div>
                <div class="score-box">
                    <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600;">Skor Evaluasi</div>
                    <div style="font-size: 22px; font-weight: 900; color: ${scoreColor}; line-height: 1.1;">
                        ${finalScore.toFixed(2)} <span style="font-size: 11px; font-weight: 600; color: #64748b;">/ 10</span>
                    </div>
                    <div style="font-size: 9.5px; font-weight: 700; color: ${scoreColor}; margin-top: 1px;">${escapeHtml(predikatText)}</div>
                    <div style="font-size: 9px; color: ${report.total_pengurang ? '#b91c1c' : '#15803d'}; font-weight: 700; margin-top: 3px;">
                        ${report.total_pengurang ? `Pengurang: -${report.total_pengurang} Poin` : escapeHtml(labels.nilDeductionText)}
                    </div>
                </div>
            </div>

            <!-- Section 1: Scored Variables -->
            <div class="section-title">
                <span>${escapeHtml(labels.sectionVarsTitle)}</span>
                <span style="font-size: 9.5px; font-weight: normal; color: #64748b;">Total ${details.length} Variabel</span>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 50%; text-align: left;">Variabel Penilaian</th>
                        <th style="width: 15%; text-align: center;">Skor (1-10)</th>
                        <th style="width: 35%; text-align: left;">Catatan Evaluator</th>
                    </tr>
                </thead>
                <tbody>
                    ${detailsRowsHtml || '<tr><td colspan="3" style="text-align: center; padding: 12px; color: #64748b;">Tidak ada variabel tercatat.</td></tr>'}
                </tbody>
            </table>

            <!-- Section 2: Faults Record -->
            <div class="section-title">
                <span>${escapeHtml(labels.sectionFaultsTitle)}</span>
                <span style="font-size: 9.5px; font-weight: normal; color: ${faults.length > 0 ? '#b91c1c' : '#15803d'};">
                    ${faults.length > 0 ? `${faults.length} Insiden Pelanggaran` : 'Nihil Pelanggaran'}
                </span>
            </div>
            ${faults.length > 0 ? `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 12%; text-align: center;">Tanggal</th>
                            <th style="width: 30%; text-align: left;">Jenis Kesalahan</th>
                            <th style="width: 14%; text-align: center;">Kategori</th>
                            <th style="width: 12%; text-align: center;">Poin</th>
                            <th style="width: 32%; text-align: left;">Kronologi / Catatan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${faultsRowsHtml}
                    </tbody>
                </table>
            ` : `
                <div style="padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; color: #166534; font-size: 9.5px; font-weight: 600; margin-bottom: 10px;">
                    ✓ ${escapeHtml(labels.nilFaultsText)}
                </div>
            `}

            <!-- Section 3: Conclusion -->
            <div class="section-title">3. Kesimpulan & Rekomendasi Evaluator</div>
            <div style="padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10px; line-height: 1.45; min-height: 38px; margin-bottom: 15px; color: #1e293b; white-space: pre-wrap;">
                ${report.kesimpulan ? escapeHtml(report.kesimpulan) : 'Tidak ada catatan kesimpulan khusus dari evaluator.'}
            </div>

            <!-- Signatures -->
            <div style="display: flex; justify-content: space-between; margin-top: 18px; margin-bottom: 8px; page-break-inside: avoid;">
                <div style="width: 30%; text-align: center; font-size: 9.5px; color: #1e293b;">
                    <div style="font-weight: 600; margin-bottom: 40px; text-transform: uppercase; font-size: 9px; color: #475569;">${escapeHtml(labels.subjectSigTitle)}</div>
                    <div style="font-weight: 700; border-bottom: 1px solid #0f172a; padding-bottom: 2px;">
                        ${escapeHtml(report.karyawan_info?.namakaryawan || report.kodekaryawan)}
                    </div>
                </div>
                <div style="width: 30%; text-align: center; font-size: 9.5px; color: #1e293b;">
                    <div style="font-weight: 600; margin-bottom: 40px; text-transform: uppercase; font-size: 9px; color: #475569;">Evaluator / Penilai</div>
                    <div style="font-weight: 700; border-bottom: 1px solid #0f172a; padding-bottom: 2px;">
                        ${escapeHtml(report.update_by_name || evaluatorName || 'Evaluator Cabang')}
                    </div>
                </div>
                <div style="width: 30%; text-align: center; font-size: 9.5px; color: #1e293b;">
                    <div style="font-weight: 600; margin-bottom: 40px; text-transform: uppercase; font-size: 9px; color: #475569;">Mengetahui (Manager Cabang / HR)</div>
                    <div style="font-weight: 700; border-bottom: 1px solid #0f172a; padding-bottom: 2px;">
                        ( ........................................ )
                    </div>
                </div>
            </div>
        </div>

        <footer class="page-footer">
            <div>Dicetak pada: ${escapeHtml(printedAt)}</div>
            <div>${escapeHtml(labels.footerText)}</div>
        </footer>
    </section>
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

/**
 * Print individual Therapist Evaluation sheet on standard Zen A4 layout
 */
export async function printTherapistEvaluationA4(options: TherapistEvaluationPrintOptions): Promise<void> {
    await printIndividualEvaluationSheetA4(options, {
        docTitlePrefix: 'Lembar Evaluasi Terapis',
        toolbarLabel: 'Pratinjau Lembar Evaluasi TR',
        headerTitle: 'LEMBAR EVALUASI & PENILAIAN TERAPIS',
        headerSubtitle: 'Dokumen Penilaian Kinerja & Audit Kepatuhan Standar SOP Terapis',
        sectionVarsTitle: '1. Rincian Penilaian Variabel Evaluasi',
        sectionFaultsTitle: '2. Catatan Pelanggaran SOP (TR Faults) Pada Periode Ini',
        nilFaultsText: 'Terapis ini tidak memiliki catatan kesalahan SOP pada periode evaluasi terpilih (Nihil Kesalahan).',
        nilDeductionText: 'Nihil Pengurang SOP',
        subjectSigTitle: 'Terapis yang Dinilai',
        footerText: 'Dokumen Resmi Zen Family Spa & Reflexology — Lembar Evaluasi TR',
        deptFallback: 'TR',
    })
}

/**
 * Print individual Employee KPI Evaluation sheet on standard Zen A4 layout
 */
export async function printEmployeeKpiEvaluationA4(options: EmployeeKpiEvaluationPrintOptions): Promise<void> {
    await printIndividualEvaluationSheetA4(options, {
        docTitlePrefix: 'Lembar Evaluasi KPI Karyawan',
        toolbarLabel: 'Pratinjau Lembar Evaluasi KPI',
        headerTitle: 'LEMBAR EVALUASI KPI KARYAWAN',
        headerSubtitle: 'Dokumen Penilaian Kinerja, Kedisiplinan & Pencapaian KPI Departemen',
        sectionVarsTitle: '1. Rincian Penilaian Variabel KPI',
        sectionFaultsTitle: '2. Catatan Pelanggaran SOP (Employee Faults) Pada Periode Ini',
        nilFaultsText: 'Karyawan ini tidak memiliki catatan kesalahan (Employee Faults) pada periode evaluasi terpilih (Nihil Kesalahan).',
        nilDeductionText: 'Nihil Pengurang Faults',
        subjectSigTitle: 'Karyawan yang Dinilai',
        footerText: 'Dokumen Resmi Zen Family Spa & Reflexology — Lembar Evaluasi KPI Karyawan',
        deptFallback: '-',
    })
}

