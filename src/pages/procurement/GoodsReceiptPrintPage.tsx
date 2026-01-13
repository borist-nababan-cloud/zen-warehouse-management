import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGoodsReceiptById } from '@/services/goodsReceiptService'
import { GoodsReceipt } from '@/types/database'
import { format } from 'date-fns'

export function GoodsReceiptPrintPage() {
    const { id } = useParams()
    const [gr, setGr] = useState<GoodsReceipt | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            loadGr(id)
        }
    }, [id])

    async function loadGr(grId: string) {
        setLoading(true)
        const res = await getGoodsReceiptById(grId)
        if (res.data) {
            setGr(res.data)
            // Optional: Auto-print when loaded
            setTimeout(() => {
                window.print()
            }, 500)
        }
        setLoading(false)
    }

    if (loading) return <div className="p-8 text-center">Loading Print View...</div>
    if (!gr) return <div className="p-8 text-center text-red-500">Goods Receipt not found</div>

    return (
        <div className="bg-white min-h-screen text-black font-sans">
            <style>{`
                @media print {
                    @page {
                        size: A5;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>

            {/* A5 Container */}
            <div className="max-w-[148mm] mx-auto p-4 md:p-8 print:w-full print:max-w-none print:p-4">

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider mb-2">Goods Receipt</h1>
                        <div className="text-sm">
                            <p className="font-bold text-gray-800">{gr.master_outlet?.name_outlet}</p>
                            <p className="text-gray-600">{gr.master_outlet?.alamat}</p>
                            <p className="text-gray-600">
                                {gr.master_outlet?.city && `${gr.master_outlet.city}, `}
                                {gr.master_outlet?.no_telp && `Ph: ${gr.master_outlet.no_telp}`}
                            </p>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">GR No:</td>
                                    <td className="font-bold text-gray-900">{gr.document_number}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">Date:</td>
                                    <td>{gr.received_at ? format(new Date(gr.received_at), 'dd MMM yyyy') : '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">PO No:</td>
                                    <td>{gr.purchase_orders?.document_number || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">Ref No:</td>
                                    <td>{gr.supplier_delivery_note || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Supplier and Receiver Info */}
                <div className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                    <div className="flex justify-between">
                        <div className="w-1/2 pr-4 border-r border-gray-300">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Supplier</h3>
                            <p className="font-bold text-sm tracking-tight">{gr.purchase_orders?.master_supplier?.name || '-'}</p>
                            <div className="text-xs text-gray-600 mt-1">
                                <p>{gr.purchase_orders?.master_supplier?.address || ''}</p>
                                <p>{gr.purchase_orders?.master_supplier?.phone || ''}</p>
                            </div>
                        </div>
                        <div className="w-1/2 pl-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Internal Notes</h3>
                            <p className="text-xs text-gray-600 italic">
                                {gr.notes || 'No document notes recorded.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2 pl-2">Item Description</th>
                                <th className="text-center py-2">Unit</th>
                                <th className="text-center py-2">Qty Received</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gr.goods_receipt_items?.map((item, index) => (
                                <tr key={item.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="py-2 pl-2">
                                        <div className="font-semibold text-gray-900">
                                            {item.purchase_order_items?.master_barang?.name || 'Unknown Item'}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">
                                            {item.purchase_order_items?.master_barang?.sku || '-'}
                                        </div>
                                    </td>
                                    <td className="text-center py-2 text-gray-600">
                                        {item.purchase_order_items?.uom_purchase || '-'}
                                    </td>
                                    <td className="text-center py-2 font-bold text-gray-900 text-base">
                                        {item.qty_received}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Signature Section */}
                <div className="grid grid-cols-3 gap-6 mt-16 page-break-inside-avoid">
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-12">Staff Procurement</p>
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p className="text-xs text-gray-600">Prepared By</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-12">Admin Holding</p>
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p className="text-xs text-gray-600">Verified By</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-12">Manager</p>
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p className="text-xs text-gray-600">Approved By</p>
                    </div>
                </div>

                {/* No-Print Footer for UI */}
                <div className="fixed bottom-4 right-4 print:hidden flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-medium"
                    >
                        🖨️ Print
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
