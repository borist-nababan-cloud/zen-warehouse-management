import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import {
    getFinancialAccounts,
    createGeneralTransaction,
    getTransactionCategories,
    FinancialAccount
} from '@/services/financeService'
import { FinanceTransactionCategory } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowUpCircle, ArrowDownCircle, Loader2, Calendar } from 'lucide-react'

export function GeneralTransactionsPage() {
    const { user } = useAuthUser()
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState<'IN' | 'OUT'>('IN')

    // Data State
    const [accounts, setAccounts] = useState<FinancialAccount[]>([])
    const [categories, setCategories] = useState<FinanceTransactionCategory[]>([])

    const [formData, setFormData] = useState({
        account_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category_id: '',
        description: ''
    })

    // Fetch Accounts on Mount
    useEffect(() => {
        const fetchAccounts = async () => {
            if (!user?.kode_outlet) return
            const result = await getFinancialAccounts(user.kode_outlet)
            if (result.isSuccess && result.data) {
                setAccounts(result.data)
            }
            setIsLoading(false)
        }
        fetchAccounts()
    }, [user?.kode_outlet])

    // Fetch Categories when Tab changes
    useEffect(() => {
        const fetchCategories = async () => {
            setCategories([]) // Clear first
            setFormData(prev => ({ ...prev, category_id: '' })) // Reset selection

            const result = await getTransactionCategories(activeTab)
            if (result.isSuccess && result.data) {
                setCategories(result.data)
            } else {
                toast.error("Failed to load categories")
            }
        }
        fetchCategories()
    }, [activeTab])

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove non-numeric chars
        const rawValue = e.target.value.replace(/\D/g, '')
        // Format with thousand separator (using ID-ID locale)
        const formatted = rawValue ? new Intl.NumberFormat('id-ID').format(Number(rawValue)) : ''
        setFormData({ ...formData, amount: formatted })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.kode_outlet || !user.id || !formData.account_id || !formData.category_id) {
            toast.error("Please fill all required fields")
            return
        }

        // Strip non-numeric chars for calculation
        const numericAmount = Number(formData.amount.replace(/\./g, '').replace(/,/g, ''))

        if (!confirm(`Are you sure you want to record ${activeTab === 'IN' ? 'Money IN' : 'Money OUT'} of ${formData.amount}?`)) return

        setIsSubmitting(true)
        const result = await createGeneralTransaction({
            document_number: `GEN-${Date.now()}`, // Temporary doc number generation
            kode_outlet: user.kode_outlet,
            financial_account_id: formData.account_id,
            transaction_type: activeTab,
            category_id: formData.category_id,
            amount: numericAmount,
            transaction_date: formData.date,
            description: formData.description,
            created_by: user.id
        })

        if (result.isSuccess) {
            toast.success("Transaction recorded successfully")
            setFormData(prev => ({ ...prev, amount: '', category_id: '', description: '' }))
        } else {
            toast.error(result.error || "Failed to record transaction")
        }
        setIsSubmitting(false)
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">General Transactions</h1>
                    <p className="text-muted-foreground mt-1">
                        Record miscellaneous expenses or capital injections.
                    </p>
                </div>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('IN')}
                        className={`flex-1 py-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${activeTab === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-gray-200 hover:border-emerald-200 text-gray-400'}`}
                    >
                        <ArrowDownCircle className={`h-8 w-8 ${activeTab === 'IN' ? 'text-emerald-600' : 'text-gray-300'}`} />
                        <span>MONEY IN</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('OUT')}
                        className={`flex-1 py-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${activeTab === 'OUT' ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold' : 'border-gray-200 hover:border-rose-200 text-gray-400'}`}
                    >
                        <ArrowUpCircle className={`h-8 w-8 ${activeTab === 'OUT' ? 'text-rose-600' : 'text-gray-300'}`} />
                        <span>MONEY OUT</span>
                    </button>
                </div>

                <Card className={`border-t-4 ${activeTab === 'IN' ? 'border-t-emerald-500' : 'border-t-rose-500'} shadow-md`}>
                    <CardHeader>
                        <CardTitle>
                            {activeTab === 'IN' ? 'Record Revenue / Top Up' : 'Record Expense / Withdrawal'}
                        </CardTitle>
                        <CardDescription>
                            This will {activeTab === 'IN' ? 'increase' : 'decrease'} the selected account balance.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Financial Account</Label>
                                    <Select
                                        value={formData.account_id}
                                        onValueChange={(val) => setFormData({ ...formData, account_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.account_name} ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(acc.balance)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Transaction Date</Label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                            className="pl-10"
                                        />
                                        <Calendar className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Amount (IDR)</Label>
                                <Input
                                    type="text"
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={handleAmountChange}
                                    required
                                    className="text-lg font-mono"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Category ({activeTab})</Label>
                                    <Select
                                        value={formData.category_id}
                                        onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name} {cat.description && `- ${cat.description}`}
                                                </SelectItem>
                                            ))}
                                            {categories.length === 0 && <span className="p-2 text-sm text-gray-500">Loading categories...</span>}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description (Optional)</Label>
                                    <Input
                                        placeholder="Add notes..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isLoading}
                                    className={activeTab === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : activeTab === 'IN' ? (
                                        <ArrowDownCircle className="mr-2 h-4 w-4" />
                                    ) : (
                                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Submit
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
