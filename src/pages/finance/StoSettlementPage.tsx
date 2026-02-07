import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { stoArService, StoArReportItem } from '@/services/stoArService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Loader2, CheckCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/Sidebar'

// Helper to format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

export default function StoSettlementPage() {
    const { user } = useAuthUser()

    const [items, setItems] = useState<StoArReportItem[]>([])
    const [loading, setLoading] = useState(true)
    const [accounts, setAccounts] = useState<{ id: string, account_name: string }[]>([])

    // Dialog State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<StoArReportItem | null>(null)

    // Form State
    const [targetAccountId, setTargetAccountId] = useState<string>('')
    const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const fetchIds = async () => {
        if (!user?.kode_outlet) return
        setLoading(true)
        try {
            // 1. Fetch "WAITING" items (Paid by recipient, Unclaimed by us)
            const data = await stoArService.getArReport({
                outlet_code: user.kode_outlet,
                status: 'WAITING'
            })
            setItems(data || [])

            // 2. Fetch Accounts (for dropdown)
            const accs = await stoArService.getMyAccounts(user.kode_outlet)
            setAccounts(accs || [])
        } catch (err: any) {
            toast.error(err.message || 'Error loading data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIds()
    }, [user?.kode_outlet])

    const handleOpenConfirm = (item: StoArReportItem) => {
        setSelectedInvoice(item)
        setTargetAccountId('') // Reset selection
        setReceivedDate(new Date().toISOString().split('T')[0])
        setIsConfirmOpen(true)
    }

    const handleSubmitConfirm = async () => {
        if (!selectedInvoice || !targetAccountId) {
            toast.error('Please select a deposit account.')
            return
        }

        setIsSubmitting(true)
        try {
            await stoArService.confirmPayment({
                invoice_id: selectedInvoice.invoice_id,
                account_id: targetAccountId,
                received_date: new Date(receivedDate)
            })

            toast.success('Payment Confirmed. Money has been added to your account balance.')

            setIsConfirmOpen(false)
            fetchIds() // Refresh list
        } catch (err: any) {
            toast.error(err.message || 'Failed to confirm')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">STO Settlement</h2>
                        <p className="text-muted-foreground">Verify and claim incoming payments from other outlets.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Unclaimed Payments ({items.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Invoice Doc</TableHead>
                                    <TableHead>STO Doc</TableHead>
                                    <TableHead>From Outlet (Payer)</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            No unclaimed payments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => (
                                        <TableRow key={item.invoice_id}>
                                            <TableCell>{formatDate(item.invoice_date)}</TableCell>
                                            <TableCell className="font-medium">{item.document_number}</TableCell>
                                            <TableCell>{item.sto_doc_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{item.debtor_outlet_name}</span>
                                                    <span className="text-xs text-muted-foreground">{item.debtor_outlet_code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatCurrency(item.total_amount)}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    WAITING CLAIM
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleOpenConfirm(item)}>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Confirm Receipt
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* CONFIRM MODAL */}
                <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Payment Receipt</DialogTitle>
                            <DialogDescription>
                                You are verifying that you have received money from <b>{selectedInvoice?.debtor_outlet_name}</b>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Amount</Label>
                                <div className="col-span-3 font-bold text-lg">
                                    {selectedInvoice ? formatCurrency(selectedInvoice.total_amount) : '-'}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="account" className="text-right">Deposit To</Label>
                                <div className="col-span-3">
                                    <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                                        <SelectTrigger id="account">
                                            <SelectValue placeholder="Select Bank/Cash Account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.account_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">Received Date</Label>
                                <div className="col-span-3">
                                    <Input
                                        id="date"
                                        type="date"
                                        value={receivedDate}
                                        onChange={(e) => setReceivedDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmitConfirm} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Receipt
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
