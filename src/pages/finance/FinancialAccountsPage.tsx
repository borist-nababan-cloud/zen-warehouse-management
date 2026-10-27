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
            toast.error(result.error || "Gagal memuat daftar rekening & kas")
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
                if (!confirm("Gerai Anda sudah memiliki akun KAS. Umumnya satu gerai hanya memiliki satu akun Kas Kecil (Petty Cash). Apakah Anda yakin ingin membuat akun kas lainnya?")) {
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
            toast.success("Akun rekening / kas berhasil dibuat")
            setIsCreateOpen(false)
            setFormData({ account_name: '', account_type: 'BANK', bank_name: '', account_number: '' }) // Reset
            fetchAccounts()
        } else {
            toast.error(result.error || "Gagal membuat akun rekening")
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
                        <h1 className="text-3xl font-bold tracking-tight">Daftar Rekening & Kas</h1>
                        <p className="text-muted-foreground mt-1">
                            Kelola rekening bank dan akun kas operasional gerai.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="mr-2 h-4 w-4" /> Tambah Akun
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {accounts.map((account) => (
                            <Card key={account.id} className={`shadow-sm border-l-4 ${account.account_type === 'CASH' ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-blue-500 bg-blue-50/30'}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-medium text-foreground">
                                            {account.account_name}
                                        </CardTitle>
                                        {account.account_type === 'CASH' ? (
                                            <Wallet className="h-5 w-5 text-emerald-600" />
                                        ) : (
                                            <Building2 className="h-5 w-5 text-blue-600" />
                                        )}
                                    </div>
                                    <CardDescription>
                                        {account.account_type === 'BANK' ? `${account.bank_name || '-'} - ${account.account_number || '-'}` : 'Kas Kecil / Kasir Operasional'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold mt-2">
                                        {formatCurrency(account.balance)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Saldo Tersedia</p>
                                </CardContent>
                            </Card>
                        ))}

                        {accounts.length === 0 && (
                            <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
                                Belum ada rekening atau kas. Klik Tambah Akun untuk memulai!
                            </div>
                        )}
                    </div>
                )}

                {/* Create Account Modal */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tambah Rekening / Kas</DialogTitle>
                            <DialogDescription>Tambahkan rekening bank atau akun kas baru untuk pencatatan dana.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Nama Akun / Rekening</Label>
                                <Input
                                    placeholder="Contoh: Kas Operasional / BCA Utama"
                                    value={formData.account_name}
                                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Jenis Akun</Label>
                                <Select
                                    value={formData.account_type}
                                    onValueChange={(val: 'CASH' | 'BANK') => setFormData({ ...formData, account_type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">KAS (Uang Fisik / Kas Kecil)</SelectItem>
                                        <SelectItem value="BANK">BANK (Rekening Digital)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.account_type === 'BANK' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Nama Bank</Label>
                                        <Input
                                            placeholder="Contoh: BCA, Mandiri, BRI"
                                            value={formData.bank_name}
                                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nomor Rekening</Label>
                                        <Input
                                            placeholder="Contoh: 1234567890"
                                            value={formData.account_number}
                                            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {formData.account_type === 'CASH' && (
                                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded flex gap-2 border border-amber-200">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>Umumnya, satu gerai hanya memerlukan SATU akun Kas Kecil (Petty Cash). Membuat lebih dari satu kas diperbolehkan namun pastikan pencatatan tetap teratur.</span>
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Akun
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
