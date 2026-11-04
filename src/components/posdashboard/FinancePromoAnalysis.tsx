import React from 'react';
import { CreditCard, Tag, Percent, Gift } from 'lucide-react';
import { PaymentMethodItem, PromoImpactItem } from '@/types/posdashboard';

interface FinancePromoAnalysisProps {
  paymentBreakdown: PaymentMethodItem[];
  promoImpact: PromoImpactItem[];
  totalSales: number;
  totalDiscounts: number;
}

export const FinancePromoAnalysis: React.FC<FinancePromoAnalysisProps> = ({
  paymentBreakdown,
  promoImpact,
  totalSales,
  totalDiscounts,
}) => {
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const grandTenderTotal = paymentBreakdown.reduce((sum, item) => sum + item.total, 0) || 1;

  return (
    <section className="mb-8">
      {/* Section Title */}
      <div className="mb-4">
        <h2 className="text-lg font-bold font-serif text-zen-charcoal flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-zen-matcha" />
          <span>Finance & Promotions Matrix</span>
        </h2>
        <p className="text-xs text-zen-muted">
          Settlement tender distribution (merged primary + split payments) and marketing promotion
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Panel 1: Payment Method Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-zen-sand/40 shadow-zen">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zen-stone/60">
            <div>
              <h3 className="text-sm font-bold text-zen-charcoal flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zen-moss" />
                <span>Payment Tenders (Split-Bill Merged)</span>
              </h3>
              <p className="text-[11px] text-zen-muted">Consolidated Cash, EDC cards, QRIS, and Vouchers</p>
            </div>
            <span className="text-xs font-semibold text-zen-moss bg-zen-paper px-2.5 py-1 rounded-lg border border-zen-sand/40">
              {paymentBreakdown.length} Channels
            </span>
          </div>

          {paymentBreakdown.length > 0 ? (
            <div className="space-y-3.5">
              {paymentBreakdown.map((item) => {
                const percent = Math.min(100, Math.round((item.total / grandTenderTotal) * 100));
                const isCash = item.method.toUpperCase().includes('CASH');
                const isGift = item.method.toUpperCase().includes('GIFT') || item.method.toUpperCase().includes('VOUCHER') || item.method.toUpperCase().includes('GC');

                return (
                  <div key={item.method} className="group">
                    <div className="flex items-center justify-between text-xs mb-1 font-medium">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${isCash ? 'bg-amber-500' : isGift ? 'bg-purple-500' : 'bg-zen-matcha'}`}></span>
                        <span className="font-semibold text-zen-charcoal">{item.method}</span>
                        <span className="text-[10px] text-zen-muted font-normal">
                          ({item.count} bills)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-zen-charcoal">
                          {formatIDR(item.total)}
                        </span>
                        <span className="text-[11px] font-semibold text-zen-muted w-9 text-right">
                          {percent}%
                        </span>
                      </div>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-zen-paper h-2 rounded-full overflow-hidden border border-zen-stone/40">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isCash ? 'bg-amber-500/80' : isGift ? 'bg-purple-500/80' : 'bg-zen-matcha'
                        }`}
                        style={{ width: `${Math.max(percent, 2)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-zen-muted text-xs">
              No financial settlements recorded for the selected outlet / period.
            </div>
          )}
        </div>

        {/* Panel 2: Promo & Discount Impact */}
        <div className="bg-white rounded-2xl p-5 border border-zen-sand/40 shadow-zen">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zen-stone/60">
            <div>
              <h3 className="text-sm font-bold text-zen-charcoal flex items-center gap-2">
                <Tag className="w-4 h-4 text-zen-moss" />
                <span>Promotion & Discount Absorption</span>
              </h3>
              <p className="text-[11px] text-zen-muted">Active promotional campaigns and total price reductions</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zen-muted uppercase font-bold">Total Absorbed</span>
              <p className="text-xs font-mono font-extrabold text-zen-bark">
                {formatIDR(totalDiscounts)}
              </p>
            </div>
          </div>

          {promoImpact.length > 0 ? (
            <div className="divide-y divide-zen-stone/60">
              {promoImpact.map((promo) => (
                <div key={promo.promoName} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-zen-paper border border-zen-sand/40 text-zen-moss">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-zen-charcoal">{promo.promoName}</h4>
                      <p className="text-[10px] text-zen-muted">{promo.usageCount} applied transactions</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-700">
                      -{formatIDR(promo.totalDiscount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gift className="w-8 h-8 text-zen-sand mx-auto mb-2 opacity-50" />
              <p className="text-xs text-zen-muted">
                No special promotional codes or vouchers redeemed today.
              </p>
            </div>
          )}

          {/* Quick Summary Pill */}
          <div className="mt-4 pt-3 border-t border-zen-stone/60 flex items-center justify-between text-[11px] bg-zen-paper/60 p-3 rounded-xl border border-zen-sand/30">
            <span className="text-zen-muted">Total Net Discount Margin:</span>
            <span className="font-bold text-zen-charcoal">
              {totalSales > 0 ? `${((totalDiscounts / (totalSales + totalDiscounts)) * 100).toFixed(1)}%` : '0%'} of Gross Value
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
