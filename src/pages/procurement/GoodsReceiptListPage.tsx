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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Plus, FileText, Printer, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'

export function GoodsReceiptListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

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
                                        <TableHead className="w-[120px] text-center">Aksi</TableHead>
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
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <span>Belum ada data penerimaan barang.</span>
                                                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-w-md text-left font-mono">
                                                        <p className="font-bold">Info Diagnostik:</p>
                                                        <p>Outlet: {user?.kode_outlet || 'N/A'}</p>
                                                        <p>Peran (Role): {user?.user_role || 'N/A'}</p>
                                                        <p>ID Pengguna: {user?.id || 'N/A'}</p>
                                                        {loading ? <p>Memuat...</p> : <p>Jumlah Data: {receipts.length}</p>}
                                                        <p className="mt-1 text-red-500 font-bold whitespace-pre-wrap">
                                                            Catatan: {receipts.length === 0 && !loading && 'Tidak ada data di database (Periksa filter / RLS)'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredReceipts.map((gr) => (
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
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Cetak Bukti Penerimaan (GR)"
                                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                                            onClick={() => {
                                                                window.open(`/procurement/goods-receipt/${gr.id}/print`, '_blank')
                                                            }}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                            <span className="sr-only">Cetak</span>
                                                        </Button>

                                                        {gr.image_url ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Lihat Foto Penerimaan Barang"
                                                                className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                                onClick={() =>
                                                                    setPreviewImage({
                                                                        url: gr.image_url!,
                                                                        title: `Bukti Penerimaan GR: ${gr.document_number}`,
                                                                    })
                                                                }
                                                            >
                                                                <ImageIcon className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <div
                                                                className="h-8 w-8 flex items-center justify-center text-slate-300 select-none"
                                                                title="Tidak ada foto bukti penerimaan"
                                                            >
                                                                -
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Goods Receipt Photo Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{previewImage?.title || 'Bukti Foto Penerimaan Barang'}</DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                        <div className="flex items-center justify-center bg-slate-900/5 rounded-lg p-2 max-h-[70vh] overflow-auto">
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                className="max-h-[65vh] w-auto object-contain rounded"
                            />
                        </div>
                    )}
                    <DialogFooter>
                        {previewImage && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(previewImage.url, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-1.5" />
                                Buka di Tab Baru
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => setPreviewImage(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
