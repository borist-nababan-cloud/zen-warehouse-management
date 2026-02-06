import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { internalUsageService } from '@/services/internalUsageService';
import { InternalUsageHeader } from '@/types/database';
import { formatDate } from '@/lib/utils';

export default function InternalUsagePrint() {
    const { id } = useParams();
    const [data, setData] = useState<InternalUsageHeader | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            internalUsageService.getUsageById(id).then(res => {
                if (res.data) setData(res.data)
                setLoading(false)
            })
        }
    }, [id]);

    useEffect(() => {
        // Auto print when loaded
        if (!loading && data) {
            setTimeout(() => window.print(), 500);
        }
    }, [loading, data]);


    if (loading) return <div>Loading Receipt...</div>;
    if (!data) return <div>Document not found</div>;

    return (
        <div className="thermal-receipt">
            <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { margin: 0; padding: 0; }
        }
        .thermal-receipt {
          width: 76mm; /* Exact width */
          padding: 2mm;
          font-family: 'Courier New', Courier, monospace; /* Monospace is best for thermal */
          font-size: 12px;
          line-height: 1.2;
          color: black;
          background: white;
          margin: 0 auto;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-bottom: 1px dashed black; margin: 5px 0; }
        .header-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
        .meta-table { width: 100%; font-size: 11px; margin-bottom: 5px; }
        .item-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .item-table th { text-align: left; border-bottom: 1px solid black; font-size: 11px; }
        .item-table td { padding-top: 3px; vertical-align: top; }
        .footer { margin-top: 15px; font-size: 10px; text-align: center; }
        .signature-box { margin-top: 20px; display: flex; justify-content: space-between; }
        .sign-line { width: 45%; text-align: center; border-top: 1px solid black; padding-top: 2px; }
      `}</style>

            {/* HEADER */}
            <div className="text-center">
                <div className="header-title">{data.master_outlet?.name_outlet}</div>
                <div>{data.master_outlet?.alamat}</div>
                <div style={{ fontSize: '10px' }}>{data.master_outlet?.no_telp}</div>
                <div className="divider"></div>
                <div className="bold">INTERNAL USAGE / EXPENSE</div>
                <div className="divider"></div>
            </div>

            {/* META INFO */}
            <table className="meta-table">
                <tbody>
                    <tr>
                        <td>Doc No:</td>
                        <td className="text-right bold">{data.document_number}</td>
                    </tr>
                    <tr>
                        <td>Date:</td>
                        <td className="text-right">{formatDate(data.transaction_date)}</td>
                    </tr>
                    <tr>
                        <td>Category:</td>
                        <td className="text-right">{data.master_issue_category?.category_name}</td>
                    </tr>
                    <tr>
                        <td>Req By:</td>
                        <td className="text-right">{data.requested_by || '-'}</td>
                    </tr>
                </tbody>
            </table>

            {/* ITEMS */}
            <table className="item-table">
                <thead>
                    <tr>
                        <th style={{ width: '60%' }}>Item</th>
                        <th style={{ width: '20%' }} className="text-right">Qty</th>
                        <th style={{ width: '20%' }} className="text-right">Unit</th>
                    </tr>
                </thead>
                <tbody>
                    {data.internal_usage_items?.map((item: any) => (
                        <tr key={item.id}>
                            <td>
                                <div className="bold">{item.master_barang?.sku}</div>
                                <div>{item.master_barang?.name}</div>
                            </td>
                            <td className="text-right">{item.qty_used}</td>
                            <td className="text-right">{item.uom || 'Pcs'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="divider" style={{ marginTop: '10px' }}></div>

            {/* NOTES */}
            {data.notes && (
                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                    <span className="bold">Notes:</span> {data.notes}
                </div>
            )}

            {/* SIGNATURES */}
            <div className="signature-box">
                <div className="sign-line">
                    <div>Approved By</div>
                </div>
                <div className="sign-line">
                    <div>Received By</div>
                </div>
            </div>

            <div className="footer">
                Printed: {new Date().toLocaleString()}
            </div>
        </div>
    );
}
