
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { stoService } from '@/services/stoService'
import { StoOrder } from '@/types/database'
import { format } from 'date-fns'

export function StoPrintPage() {
    const { id } = useParams()
    const [sto, setSto] = useState<StoOrder | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            loadSto(id)
        }
    }, [id])

    async function loadSto(stoId: string) {
        setLoading(true)
        try {
            const res = await stoService.getStoDetail(stoId)
            if (res) {
                setSto(res)
                // Optional: Auto-print when loaded
                setTimeout(() => {
                    window.print()
                }, 500)
            }
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    if (loading) return <div className="p-8 text-center">Loading Print View...</div>
    if (!sto) return <div className="p-8 text-center text-red-500">Stock Transfer Order not found</div>

    return (
        <div className="bg-white min-h-screen text-black">
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>

            {/* A4 Container */}
            <div className="max-w-[210mm] mx-auto p-4 md:p-8 print:w-full print:max-w-none print:p-8">

                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Stock Transfer Order</h1>
                        <div className="text-sm">
                            <p className="font-bold">FROM: {sto.from_master_outlet?.name_outlet}</p>
                            <p>{sto.from_master_outlet?.alamat}</p>
                            <div className="text-gray-600 mt-1">
                                <p>{sto.from_master_outlet?.city}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">STO No:</td>
                                    <td className="font-bold">{sto.document_number}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">Date:</td>
                                    <td>{sto.created_at ? format(new Date(sto.created_at), 'dd MMM yyyy') : '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold text-gray-600 pr-4">Status:</td>
                                    <td className="uppercase">{sto.sender_status}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Route Info */}
                <div className="mb-8 flex gap-8">
                    <div className="w-1/2 border p-4 rounded bg-gray-50">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Transfer To (Recipient)</h3>
                        <p className="font-bold text-lg">{sto.to_master_outlet?.name_outlet}</p>
                        <p className="text-sm">{sto.to_master_outlet?.alamat}</p>
                        <p className="text-sm text-gray-600">{sto.to_master_outlet?.city}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2">Item Name</th>
                                <th className="text-center py-2">SKU</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-right py-2">Unit Price</th>
                                <th className="text-right py-2">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sto.sto_items?.map((item) => (
                                <tr key={item.id} className="border-b border-gray-200">
                                    <td className="py-2">
                                        <div className="font-semibold">{item.master_barang?.name}</div>
                                    </td>
                                    <td className="text-center py-2 text-gray-600">{item.master_barang?.sku}</td>
                                    <td className="text-center py-2 font-bold">{item.qty_requested}</td>
                                    <td className="text-right py-2">
                                        {new Intl.NumberFormat('id-ID').format(item.price_unit)}
                                    </td>
                                    <td className="text-right py-2 font-medium">
                                        {new Intl.NumberFormat('id-ID').format((item.qty_requested || 0) * (item.price_unit || 0))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/2 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Items Total</span>
                            <span>{new Intl.NumberFormat('id-ID').format(sto.total_items_price)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Shipping Cost</span>
                            <span>{new Intl.NumberFormat('id-ID').format(sto.shipping_cost)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t border-black font-bold text-lg">
                            <span>Grand Total</span>
                            <span>Rp {new Intl.NumberFormat('id-ID').format(sto.grand_total)}</span>
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-16 page-break-inside-avoid">
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 mb-20">Authorized By</p>
                        <div className="border-t border-black w-3/4 mx-auto"></div>
                        <p className="text-sm mt-1">( Management )</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 mb-20">Issued By</p>
                        <div className="border-t border-black w-3/4 mx-auto"></div>
                        <p className="text-sm mt-1">( {sto.from_master_outlet?.name_outlet} )</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 mb-20">Received By</p>
                        <div className="border-t border-black w-3/4 mx-auto"></div>
                        <p className="text-sm mt-1">( {sto.to_master_outlet?.name_outlet} )</p>
                    </div>
                </div>

                {/* No-Print Footer for UI */}
                <div className="fixed bottom-4 right-4 print:hidden flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    >
                        Print STO
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
