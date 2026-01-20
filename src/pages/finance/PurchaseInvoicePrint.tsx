
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvoicePrintDetails, getInvoicePaymentHistory, InvoicePrintDetails } from '@/services/invoiceService'
import { FinancePaymentAllocation } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Printer } from 'lucide-react'

export default function PurchaseInvoicePrint() {
    const { invoiceId } = useParams<{ invoiceId: string }>()
    const navigate = useNavigate()
    const [invoice, setInvoice] = useState<InvoicePrintDetails | null>(null)
    const [payments, setPayments] = useState<FinancePaymentAllocation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!invoiceId) return

        const fetchData = async () => {
            try {
                const invRes = await getInvoicePrintDetails(invoiceId)
                if (invRes.isSuccess && invRes.data) {
                    setInvoice(invRes.data)

                    // Only fetch payments if status is PAID or PARTIAL
                    if (invRes.data.status === 'PAID' || invRes.data.status === 'PARTIAL') {
                        const payRes = await getInvoicePaymentHistory(invoiceId)
                        if (payRes.isSuccess && payRes.data) {
                            setPayments(payRes.data)
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading invoice print data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [invoiceId])

    if (loading) return <div className="p-8 text-center">Loading invoice...</div>
    if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found or invalid ID.</div>

    const handlePrint = () => {
        window.print()
    }

    const supplier = invoice.master_supplier
    const po = invoice.purchase_orders

    // A4 dimensions approx: 210mm x 297mm. 
    // We use standard checks for print media in CSS.
    return (
        <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
            {/* Navigation & Actions - Hidden on Print */}
            <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
                <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <Button onClick={handlePrint} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Printer className="h-4 w-4" />
                    Print Invoice
                </Button>
            </div>

            {/* Invoice Container - A4 Paper Style */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-xl min-h-[297mm] p-[15mm] print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-0">

                {/* Header */}
                <div className="flex justify-between items-start border-b border-indigo-100 pb-8 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">PURCHASE INVOICE</h1>
                        <div className="mt-4 text-sm text-slate-500 space-y-1">
                            <p>Document No: <span className="font-mono font-medium text-slate-700">{invoice.document_number}</span></p>
                            <p>Date: <span className="font-medium text-slate-700">{formatDate(invoice.invoice_date)}</span></p>
                            <p>Status: <span className="font-medium px-2 py-0.5 rounded-full text-xs uppercase bg-slate-100 border">{invoice.status}</span></p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold text-slate-700 mb-1">Bill To (Outlet)</h2>
                        <div className="text-sm text-slate-600">
                            <p className="font-medium">{invoice.kode_outlet}</p>
                            {/* If we had full outlet details joined, we'd show address here */}
                            <p>Holding / Warehouse</p>
                        </div>
                    </div>
                </div>

                {/* Supplier & Ref Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Supplier Details</h3>
                        <div className="text-sm text-slate-700">
                            <p className="font-bold text-base">{supplier?.name || `Unknown Supplier ${invoice.kode_supplier ? `(${invoice.kode_supplier})` : ''}`}</p>
                            {supplier?.address && <p>{supplier.address}</p>}
                            {supplier?.city && <p>{supplier.city}</p>}
                            {supplier?.phone && <p>Phone: {supplier.phone}</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">References</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                <span className="text-slate-500">Supplier Invoice #</span>
                                <span className="font-medium">{invoice.supplier_invoice_number || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                <span className="text-slate-500">Purchase Order #</span>
                                <span className="font-medium">{po?.document_number || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                <span className="text-slate-500">Due Date</span>
                                <span className="font-medium">{formatDate(invoice.due_date)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <Table>
                        <TableHeader className="bg-indigo-50/50">
                            <TableRow>
                                <TableHead className="w-[40%] text-indigo-900 font-semibold">Item Description</TableHead>
                                <TableHead className="text-right text-indigo-900 font-semibold">Qty</TableHead>
                                <TableHead className="text-right text-indigo-900 font-semibold">Unit Price</TableHead>
                                <TableHead className="text-right text-indigo-900 font-semibold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item, idx) => {
                                // Calculate line total for display. Note: Exact calc might depend on conversion rates.
                                // Assuming price_per_unit matches uom_purchase
                                const lineTotal = item.qty_received * item.price_per_unit
                                return (
                                    <TableRow key={idx} className="border-b border-slate-100">
                                        <TableCell>
                                            <div className="font-medium text-slate-800">{item.master_barang?.name || `Item #${item.barang_id}`}</div>
                                            <div className="text-xs text-slate-400">{item.master_barang?.sku}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {item.qty_received} <span className="text-xs text-slate-400">{item.uom_purchase}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-slate-600">
                                            {formatCurrency(item.price_per_unit)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-700">
                                            {formatCurrency(lineTotal)}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/3 space-y-3">
                        <div className="flex justify-between items-center text-slate-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.total_amount)}</span>
                        </div>
                        {/* Add Tax/Discount here if they exist in schema later */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-lg font-bold text-slate-800">
                            <span>Total Amount</span>
                            <span>{formatCurrency(invoice.total_amount)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment History (Conditional) */}
                {payments.length > 0 && (
                    <div className="border-t-2 border-slate-100 pt-8 mt-8 break-inside-avoid">
                        <h3 className="font-bold text-slate-700 mb-4 bg-slate-50 inline-block px-3 py-1 rounded">Payment History</h3>
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-xs">Payment Date</TableHead>
                                    <TableHead className="text-xs">Method</TableHead>
                                    <TableHead className="text-xs">Reference</TableHead>
                                    <TableHead className="text-xs">Notes</TableHead>
                                    <TableHead className="text-xs text-right">Amount Paid</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{formatDate(p.finance_payments_out?.payment_date)}</TableCell>
                                        <TableCell>
                                            {p.finance_payments_out?.master_financial_accounts?.account_name}
                                            <span className="text-xs text-slate-400 ml-1">
                                                ({p.finance_payments_out?.master_financial_accounts?.account_type})
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{p.finance_payments_out?.document_number}</TableCell>
                                        <TableCell className="text-xs italic text-slate-500">{p.finance_payments_out?.notes || '-'}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(p.amount_paid)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    <p>Generated by Warehouse Management System</p>
                    <p>Printed on {new Date().toLocaleString('id-ID')}</p>
                </div>
            </div>
        </div>
    )
}
