import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { getGoodsReceipts } from '@/services/goodsReceiptService'
import { GoodsReceipt } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Plus, FileText, Printer, Image as ImageIcon } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import {
    TransactionImageGalleryDialog,
    collectGrImages,
    type GalleryImageItem,
} from '@/components/common/TransactionImageGalleryDialog'

export function GoodsReceiptListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [galleryModal, setGalleryModal] = useState<{ title: string; images: GalleryImageItem[] } | null>(null)

    useEffect(() => {
        if (user?.kode_outlet) {
            loadReceipts()
        }
    }, [user?.kode_outlet])

    async function loadReceipts() {
        setLoading(true)
        const res = await getGoodsReceipts(user?.kode_outlet || '')
        if (res.data) {
            setReceipts(res.data)
        } else if (res.error) {
            console.error('[GoodsReceiptList] Fetch Error:', res.error)
            toast.error(`Gagal memuat data: ${res.error}`)
        }
        setLoading(false)
    }

    const filteredReceipts = receipts.filter(gr =>
        gr.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gr.purchase_orders?.document_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        gr.supplier_delivery_note?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Penerimaan Supplier (GR)</h1>
                        <p className="text-muted-foreground mt-1">
                            Kelola dan pantau riwayat penerimaan barang dari pemasok (Supplier).
                        </p>
                    </div>
                    {(user?.user_role === 2 || user?.user_role === 7 || user?.user_role === 8) && (
                        <Button onClick={() => navigate('/procurement/goods-receipts/create')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Terima Barang
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Riwayat Penerimaan Barang</CardTitle>
                        <div className="pt-2">
                            <Input
                                placeholder="Cari berdasarkan No. GR, No. PO, atau No. Surat Jalan..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No. Dokumen GR</TableHead>
                                        <TableHead>Tanggal Terima</TableHead>
                                        <TableHead>No. Pesanan (PO)</TableHead>
                                        <TableHead>No. Surat Jalan</TableHead>
                                        <TableHead>Diterima Oleh</TableHead>
                                        <TableHead>Rincian</TableHead>
                                        <TableHead className="w-[150px] text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                Memuat data penerimaan barang...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredReceipts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                Belum ada data penerimaan barang.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredReceipts.map((gr) => {
                                            const grImages = collectGrImages(gr)
                                            return (
                                            <TableRow
                                                key={gr.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => {
                                                    navigate(`/procurement/goods-receipt/${gr.id}`)
                                                }}
                                            >
                                                <TableCell className="font-medium font-mono text-xs">
                                                    {gr.document_number}
                                                </TableCell>
                                                <TableCell>
                                                    {gr.received_at ? format(new Date(gr.received_at), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center text-xs text-muted-foreground bg-muted w-fit px-2 py-1 rounded">
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        {gr.purchase_orders?.document_number || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{gr.supplier_delivery_note || '-'}</TableCell>
                                                <TableCell>{gr.received_by_email || gr.received_by || '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    Lihat Detail
                                                </TableCell>
                                                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Cetak Bukti Penerimaan (GR)"
                                                            className="flex flex-col h-auto py-1 px-2 gap-0.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                                            onClick={() => {
                                                                window.open(`/procurement/goods-receipt/${gr.id}/print`, '_blank')
                                                            }}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                            <span className="text-[10px] leading-tight font-medium">Cetak</span>
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={grImages.length === 0}
                                                            title={
                                                                grImages.length > 0
                                                                    ? `Lihat ${grImages.length} Foto Penerimaan Barang`
                                                                    : 'Tidak ada foto bukti penerimaan'
                                                            }
                                                            className={`flex flex-col h-auto py-1 px-2 gap-0.5 ${
                                                                grImages.length > 0
                                                                    ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50'
                                                                    : 'text-slate-300 dark:text-slate-600'
                                                            }`}
                                                            onClick={() => {
                                                                if (grImages.length === 0) return
                                                                setGalleryModal({
                                                                    title: `Bukti Foto GR: ${gr.document_number}`,
                                                                    images: grImages,
                                                                })
                                                            }}
                                                        >
                                                            <ImageIcon className="h-4 w-4" />
                                                            <span className="text-[10px] leading-tight font-medium">
                                                                {grImages.length > 0 ? `Foto (${grImages.length})` : 'Foto'}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )})
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <TransactionImageGalleryDialog
                open={!!galleryModal}
                onOpenChange={(open) => !open && setGalleryModal(null)}
                title={galleryModal?.title || 'Bukti Foto Penerimaan Barang'}
                images={galleryModal?.images || []}
            />
        </DashboardLayout>
    )
}
