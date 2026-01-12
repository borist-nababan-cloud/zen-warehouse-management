import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getFinancialAccounts, createFinancialAccount, FinancialAccount } from '@/services/financeService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Wallet, Building2, AlertCircle, Loader2 } from 'lucide-react'

export function FinancialAccountsPage() {
    const { user } = useAuthUser()
    const [accounts, setAccounts] = useState<FinancialAccount[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        account_name: '',
        account_type: 'BANK' as 'CASH' | 'BANK',
        bank_name: '',
        account_number: ''
    })

    const fetchAccounts = async () => {
        if (!user?.kode_outlet) return
        setIsLoading(true)
        const result = await getFinancialAccounts(user.kode_outlet)
        if (result.isSuccess && result.data) {
            setAccounts(result.data)
        } else {
            toast.error(result.error || "Failed to load accounts")
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchAccounts()
    }, [user?.kode_outlet])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.kode_outlet) return

        // Warning Logic for CASH accounts
        if (formData.account_type === 'CASH') {
            const existingCash = accounts.find(a => a.account_type === 'CASH')
            if (existingCash) {
                if (!confirm("You already have a CASH account. Usually, an outlet only has one Petty Cash account. Are you sure you want to create another?")) {
                    return
                }
            }
        }

        setIsSubmitting(true)
        const result = await createFinancialAccount({
            ...formData,
            kode_outlet: user.kode_outlet,
            bank_name: formData.account_type === 'BANK' ? formData.bank_name : undefined,
            account_number: formData.account_type === 'BANK' ? formData.account_number : undefined,
        })

        if (result.isSuccess) {
            toast.success("Account created successfully")
            setIsCreateOpen(false)
            setFormData({ account_name: '', account_type: 'BANK', bank_name: '', account_number: '' }) // Reset
            fetchAccounts()
        } else {
            toast.error(result.error || "Failed to create account")
        }
        setIsSubmitting(false)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Accounts</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your Cash and Bank accounts.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="mr-2 h-4 w-4" /> Add Account
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {accounts.map((account) => (
                            <Card key={account.id} className={`shadow-sm border-l-4 ${account.account_type === 'CASH' ? 'border-l-emerald-400 bg-emerald-50/50' : 'border-l-blue-400 bg-blue-50/50'}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-medium text-gray-800">
                                            {account.account_name}
                                        </CardTitle>
                                        {account.account_type === 'CASH' ? (
                                            <Wallet className="h-5 w-5 text-emerald-600" />
                                        ) : (
                                            <Building2 className="h-5 w-5 text-blue-600" />
                                        )}
                                    </div>
                                    <CardDescription>
                                        {account.account_type === 'BANK' ? `${account.bank_name} - ${account.account_number}` : 'Petty Cash / Register'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-900 mt-2">
                                        {formatCurrency(account.balance)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Available Balance</p>
                                </CardContent>
                            </Card>
                        ))}

                        {accounts.length === 0 && (
                            <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg text-gray-400">
                                No accounts found. Create your first one!
                            </div>
                        )}
                    </div>
                )}

                {/* Create Account Modal */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Financial Account</DialogTitle>
                            <DialogDescription>Create a new repository for your funds.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Account Name</Label>
                                <Input
                                    placeholder="e.g. Operational Cash / BCA Main"
                                    value={formData.account_name}
                                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={formData.account_type}
                                    onValueChange={(val: 'CASH' | 'BANK') => setFormData({ ...formData, account_type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">CASH (Physical Money)</SelectItem>
                                        <SelectItem value="BANK">BANK (Digital)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.account_type === 'BANK' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Bank Name</Label>
                                        <Input
                                            placeholder="e.g. BCA, Mandiri"
                                            value={formData.bank_name}
                                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Account Number</Label>
                                        <Input
                                            placeholder="e.g. 1234567890"
                                            value={formData.account_number}
                                            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {formData.account_type === 'CASH' && (
                                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded flex gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>Typically, an outlet only needs ONE Cash account for Petty Cash. Creating multiple is allowed but can be confusing.</span>
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Account
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
