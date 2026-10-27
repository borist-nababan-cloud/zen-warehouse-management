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

    // Fetch Accounts
    const fetchAccounts = async () => {
        if (!user?.kode_outlet) return
        const result = await getFinancialAccounts(user.kode_outlet)
        if (result.isSuccess && result.data) {
            setAccounts(result.data)
        }
        setIsLoading(false)
    }

    useEffect(() => {
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
                toast.error("Gagal memuat kategori transaksi")
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
            toast.error("Harap lengkapi semua bidang yang wajib diisi")
            return
        }

        // Strip non-numeric chars for calculation
        const numericAmount = Number(formData.amount.replace(/\./g, '').replace(/,/g, ''))
        if (!numericAmount || numericAmount <= 0) {
            toast.error("Nominal transaksi harus lebih dari 0")
            return
        }

        const transLabel = activeTab === 'IN' ? 'Kas Masuk' : 'Kas Keluar'
        if (!confirm(`Apakah Anda yakin ingin mencatat ${transLabel} sebesar Rp ${formData.amount}?`)) return

        setIsSubmitting(true)
        const result = await createGeneralTransaction({
            document_number: `GEN-${Date.now()}`,
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
            toast.success(`Transaksi ${transLabel.toLowerCase()} berhasil dicatat!`)
            setFormData(prev => ({ ...prev, amount: '', category_id: '', description: '' }))
            // Refresh account balances
            fetchAccounts()
        } else {
            toast.error(result.error || "Gagal mencatat transaksi kas")
        }
        setIsSubmitting(false)
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Transaksi Kas & Bank</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Catat penerimaan kas masuk (modal/pendapatan lain) atau pengeluaran kas keluar (biaya operasional).
                    </p>
                </div>

                <div className="flex gap-4 mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('IN')}
                        className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                            activeTab === 'IN' 
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold shadow-sm' 
                                : 'border-border/60 hover:border-emerald-200 text-muted-foreground bg-card'
                        }`}
                    >
                        <ArrowDownCircle className={`h-8 w-8 ${activeTab === 'IN' ? 'text-emerald-600' : 'text-muted-foreground/60'}`} />
                        <span className="tracking-wide">KAS MASUK (IN)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('OUT')}
                        className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                            activeTab === 'OUT' 
                                ? 'border-rose-600 bg-rose-50 text-rose-800 font-semibold shadow-sm' 
                                : 'border-border/60 hover:border-rose-200 text-muted-foreground bg-card'
                        }`}
                    >
                        <ArrowUpCircle className={`h-8 w-8 ${activeTab === 'OUT' ? 'text-rose-600' : 'text-muted-foreground/60'}`} />
                        <span className="tracking-wide">KAS KELUAR (OUT)</span>
                    </button>
                </div>

                <Card className={`border-t-4 ${activeTab === 'IN' ? 'border-t-emerald-600' : 'border-t-rose-600'} border-border/60 shadow-sm`}>
                    <CardHeader className="bg-muted/20 border-b border-border/40">
                        <CardTitle className="text-lg font-semibold text-foreground">
                            {activeTab === 'IN' ? 'Catat Kas Masuk (Penerimaan / Modal)' : 'Catat Kas Keluar (Pengeluaran / Biaya)'}
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Transaksi ini akan {activeTab === 'IN' ? 'menambah (+)' : 'mengurangi (-)'} saldo pada rekening kas/bank yang dipilih.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Rekening Kas / Bank <span className="text-destructive">*</span></Label>
                                    <Select
                                        value={formData.account_id}
                                        onValueChange={(val) => setFormData({ ...formData, account_id: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Pilih Rekening Kas/Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.account_name} ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(acc.balance)})
                                                </SelectItem>
                                            ))}
                                            {accounts.length === 0 && (
                                                <div className="p-2 text-sm text-muted-foreground">Belum ada data rekening kas/bank</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Tanggal Transaksi <span className="text-destructive">*</span></Label>
                                    <div className="relative mt-1">
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                            className="pl-10"
                                        />
                                        <Calendar className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Nominal Transaksi (Rp) <span className="text-destructive">*</span></Label>
                                <Input
                                    type="text"
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={handleAmountChange}
                                    required
                                    className="text-lg font-mono text-foreground mt-1"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Kategori {activeTab === 'IN' ? 'Kas Masuk' : 'Kas Keluar'} <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={formData.category_id}
                                        onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Pilih Kategori Transaksi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name} {cat.description ? `- ${cat.description}` : ''}
                                                </SelectItem>
                                            ))}
                                            {categories.length === 0 && (
                                                <div className="p-2 text-sm text-muted-foreground">Memuat kategori...</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Keterangan / Catatan (Opsional)</Label>
                                    <Input
                                        placeholder="Tambahkan catatan atau keterangan transaksi..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isLoading}
                                    className={
                                        activeTab === 'IN' 
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm' 
                                            : 'bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm'
                                    }
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : activeTab === 'IN' ? (
                                        <ArrowDownCircle className="mr-2 h-4 w-4" />
                                    ) : (
                                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Simpan Transaksi
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
