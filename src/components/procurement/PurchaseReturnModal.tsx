import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  FileText,
  Loader2,
  PackageMinus,
  Printer,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrencyAuto, formatDate } from '@/lib/utils'
import {
  purchaseReturnService,
  type PoReturnPreview,
  type ProcessPoReturnResult,
} from '@/services/purchaseReturnService'

interface PurchaseReturnModalProps {
  poId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}

function formatQty(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val)
}

export function PurchaseReturnModal({
  poId,
  open,
  onOpenChange,
  onSuccess,
}: PurchaseReturnModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PoReturnPreview | null>(null)

  const [returnMode, setReturnMode] = useState<'FULL_RETURN' | 'PARTIAL_RETURN'>('FULL_RETURN')
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({})
  const [shippingDeductionInput, setShippingDeductionInput] = useState<string>('0')
  const [otherCostDeductionInput, setOtherCostDeductionInput] = useState<string>('0')
  const [reopenToPartial, setReopenToPartial] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmPoNumber, setConfirmPoNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<ProcessPoReturnResult | null>(null)

  useEffect(() => {
    if (!open || !poId) {
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPreview(null)
    setReturnMode('FULL_RETURN')
    setQtyInputs({})
    setShippingDeductionInput('0')
    setOtherCostDeductionInput('0')
    setReopenToPartial(false)
    setReason('')
    setConfirmPoNumber('')
    setSubmitError(null)
    setSuccessResult(null)

    purchaseReturnService
      .getReturnPreview(poId)
      .then((res) => {
        if (cancelled) return
        setPreview(res)
        const initialQty: Record<string, string> = {}
        res.items.forEach((it) => {
          initialQty[it.po_item_id] = String(it.qty_received)
        })
        setQtyInputs(initialQty)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat data pembatalan/retur PO.'
        setLoadError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, poId])

  const handleModeChange = (nextMode: 'FULL_RETURN' | 'PARTIAL_RETURN') => {
    setReturnMode(nextMode)
    setSubmitError(null)
    if (!preview) return
    if (nextMode === 'FULL_RETURN') {
      const fullMap: Record<string, string> = {}
      preview.items.forEach((it) => {
        fullMap[it.po_item_id] = String(it.qty_received)
      })
      setQtyInputs(fullMap)
    } else {
      const zeroMap: Record<string, string> = {}
      preview.items.forEach((it) => {
        zeroMap[it.po_item_id] = '0'
      })
      setQtyInputs(zeroMap)
      setShippingDeductionInput('0')
      setOtherCostDeductionInput('0')
    }
  }

  const calculation = useMemo(() => {
    if (!preview) {
      return {
        lineStates: [],
        selectedItems: [] as Array<{ po_item_id: string; qty_returned: number }>,
        hasAnyPositiveQty: false,
        hasOverReceived: false,
        hasInsufficientStock: false,
        allRemainingSelected: false,
        itemsReturnAmount: 0,
        shippingDeduction: 0,
        otherCostDeduction: 0,
        shippingError: null as string | null,
        otherCostError: null as string | null,
        totalReturnAmount: 0,
        estimatedRemainingAp: 0,
      }
    }

    const perBarangRequested = new Map<number, number>()

    const rawLines = preview.items.map((it) => {
      const parsedQty =
        returnMode === 'FULL_RETURN'
          ? Number(it.qty_received || 0)
          : Math.max(0, Number(String(qtyInputs[it.po_item_id] || '0').replace(',', '.')) || 0)
      const qtyReturn = round4(parsedQty)
      const qtyBaseReturn = round4(qtyReturn * Number(it.conversion_rate || 1))
      const lineTotal = round2(qtyReturn * Number(it.price_per_unit || 0))
      const overReceived = qtyReturn > Number(it.qty_received || 0) + 0.0001

      perBarangRequested.set(
        it.barang_id,
        round4((perBarangRequested.get(it.barang_id) || 0) + qtyBaseReturn)
      )

      return {
        ...it,
        qtyReturn,
        qtyBaseReturn,
        lineTotal,
        overReceived,
      }
    })

    const lineStates = rawLines.map((ln) => {
      const totalBaseNeededForItem = perBarangRequested.get(ln.barang_id) || 0
      const insufficientStock =
        ln.qtyReturn > 0 &&
        totalBaseNeededForItem > Number(ln.current_stock_on_hand || 0) + 0.0001
      return {
        ...ln,
        insufficientStock,
      }
    })

    const selectedItems = lineStates
      .filter((ln) => ln.qtyReturn > 0)
      .map((ln) => ({
        po_item_id: ln.po_item_id,
        qty_returned: ln.qtyReturn,
      }))

    const hasAnyPositiveQty = selectedItems.length > 0
    const hasOverReceived = lineStates.some((ln) => ln.overReceived)
    const hasInsufficientStock = lineStates.some((ln) => ln.insufficientStock)
    const allRemainingSelected =
      lineStates.length > 0 &&
      lineStates.every((ln) => Math.abs(ln.qtyReturn - Number(ln.qty_received || 0)) <= 0.0001)

    const itemsReturnAmount = round2(
      lineStates.reduce((acc, ln) => acc + ln.lineTotal, 0)
    )

    let shippingDeduction = 0
    let shippingError: string | null = null
    const maxShipping = Number(preview.invoice?.remaining_shipping_refundable || 0)

    let otherCostDeduction = 0
    let otherCostError: string | null = null
    const remainingOtherCost = round2(
      Number(preview.invoice?.remaining_other_cost_refundable || 0)
    )

    if (preview.invoice) {
      if (returnMode === 'FULL_RETURN' || allRemainingSelected) {
        shippingDeduction = maxShipping
        otherCostDeduction = remainingOtherCost
      } else {
        const parsedShip = Number(String(shippingDeductionInput || '0').replace(',', '.'))
        if (Number.isNaN(parsedShip) || parsedShip < 0) {
          shippingError = 'Potongan ongkos kirim tidak boleh bernilai negatif.'
        } else if (parsedShip > maxShipping + 0.01) {
          shippingError = `Potongan ongkos kirim maksimal ${formatCurrencyAuto(maxShipping)}.`
        } else {
          shippingDeduction = round2(parsedShip)
        }

        const otherStr = String(otherCostDeductionInput || '0').trim().replace(',', '.')
        if (otherStr === '' || otherStr === '-') {
          if (otherStr === '-') {
            otherCostError = 'Nominal penyesuaian biaya lain-lain belum lengkap.'
          } else {
            otherCostDeduction = 0
          }
        } else {
          const parsedOther = Number(otherStr)
          if (!Number.isFinite(parsedOther)) {
            otherCostError = 'Nominal penyesuaian biaya lain-lain tidak valid.'
          } else if (remainingOtherCost >= 0) {
            if (parsedOther < 0 || parsedOther > remainingOtherCost + 0.01) {
              otherCostError = `Penyesuaian biaya lain-lain harus antara 0 hingga ${formatCurrencyAuto(remainingOtherCost)}.`
            } else {
              otherCostDeduction = round2(parsedOther)
            }
          } else {
            if (parsedOther > 0 || parsedOther < remainingOtherCost - 0.01) {
              otherCostError = `Penyesuaian potongan biaya lain-lain harus antara ${formatCurrencyAuto(remainingOtherCost)} hingga 0.`
            } else {
              otherCostDeduction = round2(parsedOther)
            }
          }
        }
      }
    }

    let totalReturnAmount = round2(itemsReturnAmount + shippingDeduction + otherCostDeduction)
    if (totalReturnAmount < 0) {
      otherCostError =
        otherCostError ||
        `Total nilai retur (${formatCurrencyAuto(totalReturnAmount)}) tidak boleh bernilai negatif.`
    }

    const apOriginal = Number(preview.invoice?.ap_original_amount || 0)
    if (
      preview.invoice &&
      allRemainingSelected &&
      Math.abs(apOriginal - totalReturnAmount) <= 1
    ) {
      totalReturnAmount = apOriginal
    }

    if (preview.invoice && totalReturnAmount > apOriginal + 0.01) {
      const msg =
        remainingOtherCost < 0
          ? `Total retur (${formatCurrencyAuto(totalReturnAmount)}) melebihi sisa hutang faktur (${formatCurrencyAuto(apOriginal)}). Sesuaikan nilai penyesuaian potongan biaya lain-lain.`
          : `Total retur (${formatCurrencyAuto(totalReturnAmount)}) melebihi sisa hutang faktur (${formatCurrencyAuto(apOriginal)}).`
      shippingError = shippingError || msg
    }

    const estimatedRemainingAp = preview.invoice
      ? Math.max(0, round2(apOriginal - totalReturnAmount))
      : 0

    return {
      lineStates,
      selectedItems,
      hasAnyPositiveQty,
      hasOverReceived,
      hasInsufficientStock,
      allRemainingSelected,
      itemsReturnAmount,
      shippingDeduction,
      otherCostDeduction,
      shippingError,
      otherCostError,
      totalReturnAmount,
      estimatedRemainingAp,
    }
  }, [preview, returnMode, qtyInputs, shippingDeductionInput, otherCostDeductionInput])

  const targetPoDoc = preview?.po.document_number || ''
  const isPoNumberConfirmed =
    Boolean(targetPoDoc) &&
    confirmPoNumber.trim().toUpperCase() === targetPoDoc.trim().toUpperCase()
  const isReasonValid = reason.trim().length >= 10

  const canSubmit = useMemo(() => {
    if (!preview || !preview.can_process || submitting || successResult) return false
    if (!isReasonValid || !isPoNumberConfirmed) return false
    if (preview.mode_type === 'SIMPLE_CANCEL') return true
    if (preview.mode_type === 'RETURN_AFTER_GR') {
      if (!calculation.hasAnyPositiveQty) return false
      if (calculation.hasOverReceived || calculation.hasInsufficientStock) return false
      if (calculation.shippingError || calculation.otherCostError) return false
      return true
    }
    return false
  }, [preview, submitting, successResult, isReasonValid, isPoNumberConfirmed, calculation])

  const handleClose = (nextOpen: boolean) => {
    if (submitting) return
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (!preview || !canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const modeToSend =
        preview.mode_type === 'SIMPLE_CANCEL'
          ? 'SIMPLE_CANCEL'
          : calculation.allRemainingSelected
            ? 'FULL_RETURN'
            : returnMode

      const result = await purchaseReturnService.processPurchaseOrderReturn({
        poId: preview.po.id,
        mode: modeToSend,
        reason: reason.trim(),
        items: modeToSend === 'PARTIAL_RETURN' ? calculation.selectedItems : [],
        shippingDeduction:
          modeToSend === 'PARTIAL_RETURN' ? calculation.shippingDeduction : 0,
        otherCostDeduction:
          modeToSend === 'PARTIAL_RETURN' ? calculation.otherCostDeduction : 0,
        reopenToPartial:
          preview.po.status === 'COMPLETED' && modeToSend === 'PARTIAL_RETURN'
            ? reopenToPartial
            : false,
      })

      setSuccessResult(result)
      toast.success(result.message)
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses pembatalan/retur PO.'
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zen-paper border-zen-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zen-charcoal">
            <RotateCcw className="h-5 w-5 text-rose-600" />
            <span>Pembatalan / Retur Pesanan Pembelian (Batal PO)</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-zen-muted">
            <Loader2 className="h-7 w-7 animate-spin text-zen-matcha" />
            <span>Memeriksa status penerimaan, stok gudang, dan faktur PO...</span>
          </div>
        ) : loadError ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal Memuat Data PO</p>
              <p className="text-xs mt-1">{loadError}</p>
            </div>
          </div>
        ) : successResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  {successResult.message}
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Status terbaru PO <strong>{successResult.po_document_number}</strong>:{' '}
                  <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50">
                    {successResult.new_po_status}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {successResult.return_document_number && (
                <div className="p-3.5 rounded-xl bg-zen-linen/70 dark:bg-black/20 border border-zen-border space-y-1">
                  <p className="text-zen-muted font-medium">No. Dokumen Retur Pembelian</p>
                  <p className="font-mono font-bold text-sm text-zen-charcoal">
                    {successResult.return_document_number}
                  </p>
                  <p className="text-zen-muted">
                    Total Nilai Retur:{' '}
                    <strong className="text-zen-charcoal">
                      {formatCurrencyAuto(successResult.total_return_amount)}
                    </strong>
                  </p>
                </div>
              )}

              {successResult.deduction_invoice_number && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-1.5">
                  <p className="text-rose-700 dark:text-rose-300 font-medium">
                    Faktur Pengurang (Nota Debet) Diterbitkan
                  </p>
                  <p className="font-mono font-bold text-sm text-rose-900 dark:text-rose-200">
                    {successResult.deduction_invoice_number}
                  </p>
                  {successResult.deduction_invoice_id && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100"
                      onClick={() =>
                        window.open(
                          `/finance/invoices/print/${successResult.deduction_invoice_id}`,
                          '_blank'
                        )
                      }
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Cetak Nota Debet</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {/* Ringkasan PO Target */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zen-linen/70 dark:bg-black/20 border border-zen-border text-xs">
              <div>
                <span className="text-zen-muted block">No. PO Target</span>
                <span className="font-mono font-bold text-zen-charcoal text-sm">
                  {preview.po.document_number}
                </span>
              </div>
              <div>
                <span className="text-zen-muted block">Outlet</span>
                <span className="font-semibold text-zen-charcoal">
                  [{preview.po.kode_outlet}] {preview.po.name_outlet}
                </span>
              </div>
              <div>
                <span className="text-zen-muted block">Pemasok (Supplier)</span>
                <span className="font-semibold text-zen-charcoal">
                  {preview.po.supplier_name}
                </span>
              </div>
              <div>
                <span className="text-zen-muted block">Status Saat Ini</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200/80 dark:bg-zen-stone text-zen-charcoal">
                  {preview.po.status}
                </span>
              </div>
            </div>

            {!preview.can_process ? (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                <Ban className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">PO Tidak Dapat Dibatalkan / Diretur</p>
                  <p className="mt-1 leading-relaxed">{preview.blocked_reason}</p>
                </div>
              </div>
            ) : (
              <>
                {preview.mode_type === 'SIMPLE_CANCEL' ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Pembatalan PO Sebelum Penerimaan Barang (Belum GR)</span>
                    </p>
                    <p className="leading-relaxed">
                      PO ini belum memiliki transaksi Penerimaan Barang (GR) maupun Faktur. Status
                      PO akan langsung diubah menjadi <strong>CANCELLED</strong> tanpa memotong stok
                      gudang atau membuat dokumen retur.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Pilihan Mode Retur: Batal Penuh vs Retur Sebagian */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zen-charcoal">
                        Pilih Jenis Pembatalan / Retur Barang
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleModeChange('FULL_RETURN')}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            returnMode === 'FULL_RETURN'
                              ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 ring-1 ring-rose-500'
                              : 'border-zen-border bg-white dark:bg-zen-stone hover:bg-zen-linen/50'
                          }`}
                        >
                          <p className="text-xs font-bold text-zen-charcoal flex items-center gap-1.5">
                            <PackageMinus className="h-4 w-4 text-rose-600" />
                            <span>Batal Penuh (100% Item Diterima)</span>
                          </p>
                          <p className="text-[11px] text-zen-muted mt-1">
                            Mengembalikan seluruh qty diterima ke supplier, memotong stok gudang, dan
                            mengubah status PO menjadi <strong>RETURNED</strong>.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleModeChange('PARTIAL_RETURN')}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            returnMode === 'PARTIAL_RETURN'
                              ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 ring-1 ring-rose-500'
                              : 'border-zen-border bg-white dark:bg-zen-stone hover:bg-zen-linen/50'
                          }`}
                        >
                          <p className="text-xs font-bold text-zen-charcoal flex items-center gap-1.5">
                            <RotateCcw className="h-4 w-4 text-amber-600" />
                            <span>Retur Sebagian (Pilih Qty per Item)</span>
                          </p>
                          <p className="text-[11px] text-zen-muted mt-1">
                            Pilih item dan jumlah yang dikembalikan (misal 2 dari 10 item). Stok
                            gudang &amp; tagihan faktur berkurang proporsional.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Tabel Item Barang */}
                    <div className="rounded-xl border border-zen-border overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-zen-linen/80 dark:bg-black/25 border-b border-zen-border text-zen-charcoal">
                          <tr>
                            <th className="text-left p-2.5 font-semibold">Barang / SKU</th>
                            <th className="text-right p-2.5 font-semibold">Diterima (Sisa)</th>
                            <th className="text-right p-2.5 font-semibold">Stok Gudang</th>
                            <th className="text-right p-2.5 font-semibold w-[150px]">Qty Retur</th>
                            <th className="text-right p-2.5 font-semibold">Potong Stok</th>
                            <th className="text-right p-2.5 font-semibold">Nilai Retur</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zen-border">
                          {calculation.lineStates.map((ln) => (
                            <tr
                              key={ln.po_item_id}
                              className={
                                ln.insufficientStock || ln.overReceived
                                  ? 'bg-red-50/80 dark:bg-red-950/30'
                                  : ''
                              }
                            >
                              <td className="p-2.5">
                                <div className="font-semibold text-zen-charcoal">
                                  {ln.item_name}
                                </div>
                                <div className="text-[11px] text-zen-muted font-mono">
                                  {ln.sku} • {formatCurrencyAuto(ln.price_per_unit)}/{ln.uom_purchase}
                                </div>
                                {ln.insufficientStock && (
                                  <p className="text-[11px] text-red-600 font-semibold mt-0.5">
                                    Stok tidak mencukupi (tersedia{' '}
                                    {formatQty(ln.current_stock_on_hand)} {ln.base_uom})
                                  </p>
                                )}
                                {ln.overReceived && (
                                  <p className="text-[11px] text-red-600 font-semibold mt-0.5">
                                    Melebihi qty diterima ({formatQty(ln.qty_received)})
                                  </p>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono">
                                {formatQty(ln.qty_received)} {ln.uom_purchase}
                              </td>
                              <td className="p-2.5 text-right font-mono">
                                {formatQty(ln.current_stock_on_hand)} {ln.base_uom}
                              </td>
                              <td className="p-2.5 text-right">
                                {returnMode === 'FULL_RETURN' ? (
                                  <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                                    {formatQty(ln.qtyReturn)} {ln.uom_purchase}
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={ln.qty_received}
                                      step="any"
                                      value={qtyInputs[ln.po_item_id] ?? '0'}
                                      onChange={(e) => {
                                        setQtyInputs((prev) => ({
                                          ...prev,
                                          [ln.po_item_id]: e.target.value,
                                        }))
                                        setSubmitError(null)
                                      }}
                                      className="h-7 w-20 text-right font-mono text-xs px-2"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setQtyInputs((prev) => ({
                                          ...prev,
                                          [ln.po_item_id]: String(ln.qty_received),
                                        }))
                                      }
                                      className="px-1.5 py-1 rounded text-[10px] font-semibold bg-zen-sand/30 hover:bg-zen-sand/50 text-zen-charcoal"
                                      title="Isi Maksimal"
                                    >
                                      Max
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setQtyInputs((prev) => ({
                                          ...prev,
                                          [ln.po_item_id]: '0',
                                        }))
                                      }
                                      className="px-1.5 py-1 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600"
                                      title="Kosongkan"
                                    >
                                      0
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono text-rose-700 dark:text-rose-300">
                                -{formatQty(ln.qtyBaseReturn)} {ln.base_uom}
                              </td>
                              <td className="p-2.5 text-right font-semibold text-zen-charcoal">
                                {formatCurrencyAuto(ln.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Opsi buka kembali ke PARTIAL untuk PO COMPLETED saat Retur Sebagian */}
                    {preview.po.status === 'COMPLETED' &&
                      returnMode === 'PARTIAL_RETURN' &&
                      !calculation.allRemainingSelected && (
                        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reopenToPartial}
                            onChange={(e) => setReopenToPartial(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span>
                            <strong className="text-blue-900 dark:text-blue-200">
                              Buka kembali status PO menjadi PARTIAL
                            </strong>
                            <span className="block text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
                              Centang opsi ini jika pemasok akan mengirim ulang barang pengganti
                              melalui menu Penerimaan Supplier (GR).
                            </span>
                          </span>
                        </label>
                      )}

                    {/* Dampak Faktur & Hutang AP (Khusus PO Status INVOICED) */}
                    {preview.invoice && (
                      <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-indigo-600" />
                            <span>
                              Dampak Faktur &amp; Hutang Supplier ({preview.invoice.document_number})
                            </span>
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {preview.invoice.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-black/20 border border-indigo-100 dark:border-indigo-900">
                            <span className="text-zen-muted block">Sisa Hutang AP Saat Ini</span>
                            <span className="font-bold text-sm text-zen-charcoal">
                              {formatCurrencyAuto(preview.invoice.ap_original_amount)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-black/20 border border-rose-200 dark:border-rose-900">
                            <span className="text-rose-700 dark:text-rose-300 block">
                              Nota Debet Pengurang
                            </span>
                            <span className="font-bold text-sm text-rose-700 dark:text-rose-300">
                              -{formatCurrencyAuto(calculation.totalReturnAmount)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-black/20 border border-emerald-200 dark:border-emerald-900">
                            <span className="text-emerald-700 dark:text-emerald-300 block">
                              Estimasi Sisa Hutang AP
                            </span>
                            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                              {formatCurrencyAuto(calculation.estimatedRemainingAp)}
                            </span>
                          </div>
                        </div>

                        {preview.invoice.remaining_shipping_refundable > 0 &&
                          returnMode === 'PARTIAL_RETURN' &&
                          !calculation.allRemainingSelected && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-200/70">
                              <div>
                                <Label
                                  htmlFor="shipping-deduction-input"
                                  className="text-xs font-semibold text-indigo-950 dark:text-indigo-200"
                                >
                                  Potongan Ongkos Kirim di Nota Debet (Opsional)
                                </Label>
                                <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                                  Maksimal sisa ongkir:{' '}
                                  {formatCurrencyAuto(preview.invoice.remaining_shipping_refundable)}
                                </p>
                              </div>
                              <Input
                                id="shipping-deduction-input"
                                type="number"
                                min={0}
                                max={preview.invoice.remaining_shipping_refundable}
                                step="0.01"
                                value={shippingDeductionInput}
                                onChange={(e) => {
                                  setShippingDeductionInput(e.target.value)
                                  setSubmitError(null)
                                }}
                                className="w-full sm:w-44 h-8 text-right font-mono text-xs bg-white dark:bg-zen-stone"
                              />
                            </div>
                          )}

                        {Math.abs(preview.invoice.remaining_other_cost_refundable || 0) > 0.001 &&
                          (returnMode === 'FULL_RETURN' || calculation.allRemainingSelected ? (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-indigo-200/70 text-[11px] text-indigo-900 dark:text-indigo-200">
                              <div>
                                <span className="font-semibold">
                                  Penyesuaian Biaya Lain-lain Otomatis (Retur Penuh):
                                </span>
                                {preview.invoice.other_cost_notes && (
                                  <span className="block italic text-indigo-700/80 dark:text-indigo-300/80">
                                    {preview.invoice.other_cost_notes}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold whitespace-nowrap">
                                {calculation.otherCostDeduction >= 0 ? '+' : ''}
                                {formatCurrencyAuto(calculation.otherCostDeduction)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-200/70">
                              <div>
                                <Label
                                  htmlFor="other-cost-deduction-input"
                                  className="text-xs font-semibold text-indigo-950 dark:text-indigo-200"
                                >
                                  Penyesuaian Biaya Lain-lain di Nota Debet (Opsional)
                                </Label>
                                <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                                  Rentang:{' '}
                                  {preview.invoice.remaining_other_cost_refundable >= 0
                                    ? `0 s.d. ${formatCurrencyAuto(preview.invoice.remaining_other_cost_refundable)}`
                                    : `${formatCurrencyAuto(preview.invoice.remaining_other_cost_refundable)} s.d. 0`}
                                  {preview.invoice.other_cost_notes
                                    ? ` • ${preview.invoice.other_cost_notes}`
                                    : ''}
                                </p>
                              </div>
                              <Input
                                id="other-cost-deduction-input"
                                type="number"
                                min={
                                  preview.invoice.remaining_other_cost_refundable < 0
                                    ? preview.invoice.remaining_other_cost_refundable
                                    : 0
                                }
                                max={
                                  preview.invoice.remaining_other_cost_refundable >= 0
                                    ? preview.invoice.remaining_other_cost_refundable
                                    : 0
                                }
                                step="0.01"
                                value={otherCostDeductionInput}
                                onChange={(e) => {
                                  setOtherCostDeductionInput(e.target.value)
                                  setSubmitError(null)
                                }}
                                className="w-full sm:w-44 h-8 text-right font-mono text-xs bg-white dark:bg-zen-stone"
                              />
                            </div>
                          ))}

                        {calculation.shippingError && (
                          <p className="text-[11px] text-red-600 font-semibold">
                            {calculation.shippingError}
                          </p>
                        )}
                        {calculation.otherCostError && (
                          <p className="text-[11px] text-red-600 font-semibold">
                            {calculation.otherCostError}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Pengaman Wajib: Alasan + Konfirmasi Ketik Ulang No. PO */}
                <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Verifikasi Keamanan (Wajib Diisi Sebelum Eksekusi)</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="po-return-reason"
                        className="text-xs font-semibold text-zen-charcoal"
                      >
                        1. Alasan Pembatalan / Retur <span className="text-red-500">*</span>
                      </Label>
                      <span
                        className={`text-[11px] ${
                          isReasonValid ? 'text-emerald-600' : 'text-zen-muted'
                        }`}
                      >
                        {reason.trim().length}/10 karakter minimum
                      </span>
                    </div>
                    <textarea
                      id="po-return-reason"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value)
                        setSubmitError(null)
                      }}
                      rows={2}
                      placeholder="Contoh: Barang dikirim rusak/kadaluarsa atau salah input penerimaan dari supplier."
                      className="w-full rounded-xl border border-zen-border bg-white dark:bg-zen-stone px-3 py-2 text-xs text-zen-charcoal focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label
                        htmlFor="po-return-confirm-number"
                        className="text-xs font-semibold text-zen-charcoal"
                      >
                        2. Ketik Ulang Nomor PO Target <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-zen-stone border border-zen-border font-mono font-bold text-zen-charcoal">
                        No. PO Target: {targetPoDoc}
                      </span>
                    </div>
                    <Input
                      id="po-return-confirm-number"
                      value={confirmPoNumber}
                      onChange={(e) => {
                        setConfirmPoNumber(e.target.value)
                        setSubmitError(null)
                      }}
                      placeholder={`Ketik persis: ${targetPoDoc}`}
                      className={`font-mono text-xs bg-white dark:bg-zen-stone ${
                        confirmPoNumber && !isPoNumberConfirmed
                          ? 'border-red-400 focus-visible:ring-red-500'
                          : isPoNumberConfirmed
                            ? 'border-emerald-500 focus-visible:ring-emerald-500'
                            : ''
                      }`}
                    />
                  </div>
                </div>

                {preview.history.length > 0 && (
                  <div className="p-3 rounded-xl bg-zen-linen/50 dark:bg-black/15 border border-zen-border text-[11px] space-y-1">
                    <p className="font-semibold text-zen-charcoal">
                      Riwayat Retur Sebelumnya pada PO ini ({preview.history.length}x):
                    </p>
                    {preview.history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-zen-muted">
                        <span>
                          {h.document_number} ({formatDate(h.created_at)}) — {h.reason}
                        </span>
                        <span className="font-semibold text-zen-charcoal">
                          -{formatCurrencyAuto(h.total_return_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {successResult ? (
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-zen-matcha hover:bg-zen-moss text-white"
            >
              Selesai &amp; Tutup
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Tutup
              </Button>
              {preview?.can_process && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  <span>
                    {submitting
                      ? 'Memproses...'
                      : preview.mode_type === 'SIMPLE_CANCEL'
                        ? 'Konfirmasi Batal PO'
                        : 'Proses Retur & Potong Stok'}
                  </span>
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
