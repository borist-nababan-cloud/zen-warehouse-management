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
import { Plus, FileText, Printer } from 'lucide-react'
import { format } from 'date-fns'

export function GoodsReceiptListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

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
        }
        setLoading(false)
    }

    const filteredReceipts = receipts.filter(gr =>
        gr.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gr.purchase_orders?.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gr.supplier_delivery_note?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Goods Receipts</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage and view received goods history.
                        </p>
                    </div>
                    {(user?.user_role === 2 || user?.user_role === 7 || user?.user_role === 8) && (
                        <Button onClick={() => navigate('/procurement/goods-receipts/create')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Receive Goods
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>History</CardTitle>
                        <div className="pt-2">
                            <Input
                                placeholder="Search by GR Number, PO Number, or Delivery Note..."
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
                                        <TableHead>GR Number</TableHead>
                                        <TableHead>Received Date</TableHead>
                                        <TableHead>PO Number</TableHead>
                                        <TableHead>Delivery Note</TableHead>
                                        <TableHead>Received By</TableHead>
                                        <TableHead>Item Count</TableHead>
                                        <TableHead className="w-[100px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredReceipts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No receipts found.
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
                                                    {gr.received_at ? format(new Date(gr.received_at), 'dd MMM yyyy, HH:mm') : '-'}
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
                                                    View Detail
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            window.open(`/procurement/goods-receipt/${gr.id}/print`, '_blank')
                                                        }}
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                        <span className="sr-only">Print</span>
                                                    </Button>
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
        </DashboardLayout>
    )
}
