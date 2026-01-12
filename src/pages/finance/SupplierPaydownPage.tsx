import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getFinancialAccounts, getUnpaidInvoices, processPaydown, FinancialAccount, UnpaidInvoice } from '@/services/financeService'
import { getSuppliers } from '@/services/supplierService'
import { MasterSupplierWithBank } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, DollarSign } from 'lucide-react'

export function SupplierPaydownPage() {
    const { user } = useAuthUser()
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Data State
    const [suppliers, setSuppliers] = useState<MasterSupplierWithBank[]>([])
    const [accounts, setAccounts] = useState<FinancialAccount[]>([])
    const [invoices, setInvoices] = useState<UnpaidInvoice[]>([])

    // Selection State
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
    const [discounts, setDiscounts] = useState<Record<string, string>>({}) // Map invoice_id -> raw discount string

    const [paymentAccount, setPaymentAccount] = useState<string>('')
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState<string>('')

    // Fetch Suppliers and Accounts on Mount
    useEffect(() => {
        const initData = async () => {
            if (!user?.kode_outlet) return
            setIsLoading(true)
            const [suppResult, accResult] = await Promise.all([
                getSuppliers(user.kode_outlet),
                getFinancialAccounts(user.kode_outlet)
            ])

            if (suppResult.data) setSuppliers(suppResult.data)
            if (accResult.data) setAccounts(accResult.data)
            setIsLoading(false)
        }
        initData()
    }, [user?.kode_outlet])

    // Fetch Invoices when Supplier changes
    useEffect(() => {
        if (!user?.kode_outlet || !selectedSupplierId) {
            setInvoices([])
            setSelectedInvoiceIds(new Set())
            setDiscounts({})
            return
        }

        const fetchInvoices = async () => {
            setIsLoading(true)
            const outletCode = user.kode_outlet as string
            const result = await getUnpaidInvoices(selectedSupplierId, outletCode)
            if (result.data) {
                setInvoices(result.data)
            } else {
                toast.error("Failed to fetch unpaid invoices")
            }
            setIsLoading(false)
        }
        fetchInvoices()
    }, [selectedSupplierId, user?.kode_outlet])

    const toggleInvoice = (id: string) => {
        const newSet = new Set(selectedInvoiceIds)
        if (newSet.has(id)) {
            newSet.delete(id)
            // Optional: clear discount when deselected? 
            // setDiscounts(prev => { const n = {...prev}; delete n[id]; return n; })
        } else {
            newSet.add(id)
        }
        setSelectedInvoiceIds(newSet)
    }

    const handleDiscountChange = (id: string, val: string) => {
        // Only allow numbers
        const raw = val.replace(/\D/g, '')
        const formatted = raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : ''
        setDiscounts(prev => ({ ...prev, [id]: formatted }))
    }

    const calculateTotal = () => {
        let totalToPay = 0
        let totalDiscount = 0

        selectedInvoiceIds.forEach(id => {
            const inv = invoices.find(i => i.invoice_id === id)
            if (inv) {
                const discountRaw = discounts[id]?.replace(/\./g, '') || '0'
                const discount = Number(discountRaw)
                const toPay = Math.max(0, inv.remaining_balance - discount)

                totalToPay += toPay
                totalDiscount += discount
            }
        })
        return { totalToPay, totalDiscount }
    }

    const handlePayement = async () => {
        if (!user?.kode_outlet || !user.id || !selectedSupplierId || !paymentAccount) return

        const { totalToPay } = calculateTotal()

        if (selectedInvoiceIds.size === 0) {
            toast.error("Please select at least one invoice to pay.")
            return
        }

        if (!confirm(`Confirm payment of ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalToPay)}?`)) return

        setIsSubmitting(true)

        const invoicePayload = Array.from(selectedInvoiceIds).map(id => {
            const inv = invoices.find(i => i.invoice_id === id)
            const discountRaw = discounts[id]?.replace(/\./g, '') || '0'
            const discount = Number(discountRaw)
            // The logic: Pay Amount = Remaining - Discount.
            // But we send 'amount' as the CASH portion to the backend.
            const payAmount = Math.max(0, (inv?.remaining_balance || 0) - discount)

            return {
                invoice_id: id,
                amount: payAmount,
                discount: discount
            }
        })

        const result = await processPaydown({
            outlet_id: user.kode_outlet,
            supplier_id: selectedSupplierId,
            account_id: paymentAccount,
            payment_date: paymentDate,
            total_amount: totalToPay,
            invoices: invoicePayload,
            notes: notes,
            user_id: user.id
        })

        if (result.isSuccess) {
            toast.success("Payment processed successfully!")
            setSelectedInvoiceIds(new Set())
            setDiscounts({})
            setPaymentAccount('')
            setNotes('')

            // Refresh Data
            const invResult = await getUnpaidInvoices(selectedSupplierId, user.kode_outlet)
            if (invResult.data) setInvoices(invResult.data)
            const accResult = await getFinancialAccounts(user.kode_outlet)
            if (accResult.data) setAccounts(accResult.data)
        } else {
            toast.error(result.error || "Payment failed. Check balance.")
        }
        setIsSubmitting(false)
    }

    const totals = calculateTotal()

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Supplier Debt Settlement</h1>
                    <p className="text-muted-foreground mt-1">
                        Pay off outstanding invoices with optional settlement discounts.
                    </p>
                </div>

                {isLoading && <div className="text-center py-4"><Loader2 className="animate-spin h-6 w-6 mx-auto text-indigo-600" /></div>}

                {/* Step 1: Select Supplier */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base text-gray-600 uppercase tracking-wider">Step 1: Select Supplier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                            <SelectTrigger className="w-full md:w-1/2">
                                <SelectValue placeholder="Select Supplier..." />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map(s => (
                                    <SelectItem key={s.kode_supplier} value={s.kode_supplier}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Step 2: Select Invoices */}
                {selectedSupplierId && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base text-gray-600 uppercase tracking-wider flex justify-between">
                                <span>Step 2: Select Invoices & Apply Discounts</span>
                                <span className="text-sm normal-case font-normal text-muted-foreground">{invoices.length} Unpaid Invoices</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {invoices.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">No unpaid invoices found for this supplier.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead>Invoice No</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead className="text-right">Original</TableHead>
                                            <TableHead className="text-right">Remaining</TableHead>
                                            <TableHead className="text-right w-[200px]">Discount (IDR)</TableHead>
                                            <TableHead className="text-right">Net To Pay</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map(inv => {
                                            const isSelected = selectedInvoiceIds.has(inv.invoice_id)
                                            const discountVal = Number(discounts[inv.invoice_id]?.replace(/\./g, '') || 0)
                                            const netPay = Math.max(0, inv.remaining_balance - discountVal)

                                            return (
                                                <TableRow key={inv.invoice_id} className={isSelected ? "bg-indigo-50" : ""}>
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                            checked={isSelected}
                                                            onChange={() => toggleInvoice(inv.invoice_id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{inv.document_number}</TableCell>
                                                    <TableCell className={new Date(inv.due_date) < new Date() ? "text-red-600 font-bold" : "text-gray-600"}>
                                                        {inv.due_date}
                                                    </TableCell>
                                                    <TableCell className="text-right text-gray-400">
                                                        {new Intl.NumberFormat('id-ID').format(inv.total_amount)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-gray-900">
                                                        {new Intl.NumberFormat('id-ID').format(inv.remaining_balance)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {isSelected ? (
                                                            <Input
                                                                className="h-8 text-right font-mono text-sm"
                                                                placeholder="0"
                                                                value={discounts[inv.invoice_id] || ''}
                                                                onChange={(e) => handleDiscountChange(inv.invoice_id, e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-600">
                                                        {isSelected ? new Intl.NumberFormat('id-ID').format(netPay) : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Payment Details */}
                {selectedInvoiceIds.size > 0 && (
                    <Card className="border-t-4 border-indigo-500 shadow-lg bg-white sticky bottom-4 z-10">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                                <div className="space-y-4 flex-1">
                                    <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Payment Execution
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Pay From Account</Label>
                                            <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map(acc => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.account_name} ({new Intl.NumberFormat('id-ID').format(acc.balance)})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Payment Date</Label>
                                            <Input
                                                type="date"
                                                value={paymentDate}
                                                onChange={(e) => setPaymentDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Notes</Label>
                                            <Input
                                                placeholder="Optional reference"
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right min-w-[250px] space-y-2">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Subtotal:</span>
                                        <span>{new Intl.NumberFormat('id-ID').format(totals.totalToPay + totals.totalDiscount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                                        <span>Total Discount:</span>
                                        <span>- {new Intl.NumberFormat('id-ID').format(totals.totalDiscount)}</span>
                                    </div>

                                    <div className="pt-2 border-t border-gray-200">
                                        <p className="text-sm text-gray-600 mb-1">Total Cash Payment</p>
                                        <p className="text-3xl font-bold text-indigo-600">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totals.totalToPay)}
                                        </p>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                                        onClick={handlePayement}
                                        disabled={isSubmitting || !paymentAccount}
                                    >
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Confirm Payment
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}
