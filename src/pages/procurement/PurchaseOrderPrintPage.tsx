import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPurchaseOrderById } from '@/services/purchaseOrderService'
import { PurchaseOrder } from '@/types/database'
import { format } from 'date-fns'

export function PurchaseOrderPrintPage() {
    const { id } = useParams()
    const [po, setPo] = useState<PurchaseOrder | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            loadPo(id)
        }
    }, [id])

    async function loadPo(poId: string) {
        setLoading(true)
        const res = await getPurchaseOrderById(poId)
        if (res.data) {
            setPo(res.data)
            // Optional: Auto-print when loaded
            setTimeout(() => {
                window.print()
            }, 500)
        }
        setLoading(false)
    }

    if (loading) return <div className="p-8 text-center">Loading Print View...</div>
    if (!po) return <div className="p-8 text-center text-red-500">Purchase Order not found</div>

    return (
        <div className="bg-white min-h-screen text-black">
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
                    /* Hide everything else if embedded, but this is a dedicated page */
                }
            `}</style>

            {/* A5 Container - Padding optimized for print */}
            <div className="max-w-[148mm] mx-auto p-4 md:p-8 print:w-full print:max-w-none print:p-4">

                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider mb-2">Purchase Order</h1>
                        <div className="text-sm">
                            <p className="font-bold">{po.master_outlet?.name_outlet}</p>
                            <p>{po.master_outlet?.alamat}</p>
                            <p>
                                {po.master_outlet?.city && `${po.master_outlet.city}, `}
                                {po.master_outlet?.province}
                            </p>
                            <div className="mt-1 text-gray-600">
                                {po.master_outlet?.no_telp && <p>Phone: {po.master_outlet.no_telp}</p>}
                                {po.master_outlet?.email && <p>Email: {po.master_outlet.email}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">PO No:</td>
                                    <td className="font-bold">{po.document_number}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">Date:</td>
                                    <td>{po.created_at ? format(new Date(po.created_at), 'dd MMM yyyy') : '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">Due Date:</td>
                                    <td>{po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd MMM yyyy') : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Supplier Info */}
                <div className="mb-6">
                    <div className="flex">
                        <div className="w-1/2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Supplier</h3>
                            <div className="text-sm font-semibold border p-2 rounded bg-gray-50">
                                <p>{po.master_supplier?.name}</p>
                                <p className="font-normal text-xs mt-1 text-gray-600">
                                    {po.master_supplier?.address || '-'} <br />
                                    {po.master_supplier?.phone || '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2">Item</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-center py-2">Unit</th>
                                <th className="text-right py-2">Price</th>
                                <th className="text-right py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.purchase_order_items?.map((item) => (
                                <tr key={item.id} className="border-b border-gray-200">
                                    <td className="py-2">
                                        <div className="font-semibold">{item.master_barang?.name}</div>
                                        <div className="text-xs text-gray-500">{item.master_barang?.sku}</div>
                                    </td>
                                    <td className="text-center py-2">{item.qty_ordered}</td>
                                    <td className="text-center py-2">{item.uom_purchase}</td>
                                    <td className="text-right py-2">
                                        {new Intl.NumberFormat('id-ID').format(item.price_per_unit)}
                                    </td>
                                    <td className="text-right py-2 font-medium">
                                        {new Intl.NumberFormat('id-ID').format((item.qty_ordered || 0) * (item.price_per_unit || 0))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                    <div className="w-1/2">
                        <div className="flex justify-between py-1 border-b">
                            <span className="font-bold">Total</span>
                            <span className="font-bold text-lg">
                                Rp {new Intl.NumberFormat('id-ID').format(po.total_amount)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Signature */}
                <div className="grid grid-cols-2 gap-8 mt-12 page-break-inside-avoid">
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 mb-16">Prepared By</p>
                        <div className="border-t border-black w-3/4 mx-auto"></div>
                        <p className="text-sm mt-1">( Staff Procurement )</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 mb-16">Approved By</p>
                        <div className="border-t border-black w-3/4 mx-auto"></div>
                        <p className="text-sm mt-1">( Manager )</p>
                    </div>
                </div>

                {/* No-Print Footer for UI */}
                <div className="fixed bottom-4 right-4 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    >
                        Print PO (A5)
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600 ml-2"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
