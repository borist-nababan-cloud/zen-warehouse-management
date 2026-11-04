import React from 'react';
import {
  DollarSign,
  Wallet,
  Users,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Sparkles,
  Layers,
  Gift,
  Target
} from 'lucide-react';
import { GlobalGardenSummary } from '@/types/posdashboard';

interface ZenGardenSummaryProps {
  summary: GlobalGardenSummary;
  selectedOutletName?: string;
  selectedOutletCode?: string;
  onResetOutlet?: () => void;
  isPeriodic?: boolean;
}

export const ZenGardenSummary: React.FC<ZenGardenSummaryProps> = ({
  summary,
  selectedOutletName = 'All Active Outlets',
  selectedOutletCode = 'ALL',
  onResetOutlet,
  isPeriodic = false,
}) => {
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const { categoryMix, topItems } = summary;

  return (
    <section className="mb-8">
      {/* Eye-Catching Outlet Header Banner for Single Outlet Detail View */}
      {selectedOutletCode && selectedOutletCode !== 'ALL' ? (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-white border-2 border-zen-matcha/50 shadow-zen relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-zen-matcha/5 rounded-full -mr-12 -mt-12 pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="px-3.5 py-2.5 rounded-xl bg-zen-matcha text-white font-mono font-black text-xl sm:text-2xl shadow-sm tracking-wider flex items-center justify-center ring-2 ring-zen-moss/30 flex-shrink-0">
                {selectedOutletCode}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal tracking-tight">
                    {selectedOutletName}
                  </h2>
                  <span className="flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                    {isPeriodic ? 'Filter Cabang' : 'Live Branch Detail'}
                  </span>
                </div>
                <p className="text-xs text-zen-muted font-medium mt-0.5">
                  {isPeriodic
                    ? 'Ringkasan operasional berkala, bauran produk & layanan, serta performa cabang'
                    : 'Dedicated operational overview, staff on-duty, and floor capacity analysis'}
                </p>
              </div>
            </div>

            {onResetOutlet && (
              <button
                onClick={onResetOutlet}
                className="self-start sm:self-auto flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-zen-paper hover:bg-white border border-zen-sand/60 text-zen-charcoal text-xs font-bold hover:border-zen-matcha hover:text-zen-moss transition-all shadow-sm active:scale-95"
              >
                <span>&larr; Back to All Outlets</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Global Network Sub-heading */
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold font-serif text-zen-charcoal flex items-center gap-2">
              <span>Zen Family Spa & Reflexology</span>
              <span className="text-xs font-sans font-normal text-zen-muted bg-white px-2.5 py-0.5 rounded-full border border-zen-sand/40">
                {selectedOutletName}
              </span>
            </h2>
            <p className="text-xs text-zen-muted">
              {isPeriodic
                ? 'Ringkasan operasional dan performa finansial untuk periode terpilih'
                : "Today's high-level operational velocity and financial liquidity"}
            </p>
          </div>
        </div>
      )}

      {/* Primary Hero Cards: 4 columns in periodic mode, 5 in live mode */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isPeriodic ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4 sm:gap-4 mb-5`}>
        
        {/* Card 1: Total Sales */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-zen-sand/40 shadow-zen hover:shadow-zen-hover transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-zen-muted uppercase tracking-wider mb-1">
                Gross Revenue
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-zen-charcoal tracking-tight">
                {formatIDR(summary.totalSales)}
              </h3>
            </div>
            <div className="p-2 bg-zen-matcha/10 text-zen-matcha rounded-xl border border-zen-matcha/20 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-zen-moss" />
            </div>
          </div>
          {/* Target Progress in Periodic Mode, or Discounts in Live Mode */}
          {isPeriodic && summary.totalTargetSales && summary.totalTargetSales > 0 ? (
            <div className="mt-3 pt-2.5 border-t border-zen-stone/60">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-zen-muted flex items-center gap-1 text-[11px]">
                  <Target className="w-3.5 h-3.5 text-zen-matcha" />
                  <span>Target: {formatIDR(summary.totalTargetSales)}</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  (summary.totalSales / summary.totalTargetSales) >= 1
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-zen-matcha/15 text-zen-moss border border-zen-matcha/30'
                }`}>
                  {((summary.totalSales / summary.totalTargetSales) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-zen-stone/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary.totalSales / summary.totalTargetSales) >= 1 ? 'bg-emerald-500' : 'bg-zen-matcha'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, Math.round((summary.totalSales / summary.totalTargetSales) * 100)))}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="mt-3 pt-2.5 border-t border-zen-stone/60 flex items-center justify-between text-xs">
              <span className="text-zen-muted flex items-center">
                <Tag className="w-3.5 h-3.5 mr-1 text-zen-muted" />
                Discounts / Promos
              </span>
              <span className="font-semibold text-zen-bark">
                {formatIDR(summary.totalDiscounts)}
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Cash on Hand */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-zen-sand/40 shadow-zen hover:shadow-zen-hover transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-zen-muted uppercase tracking-wider mb-1">
                Cash on Hand
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-zen-charcoal tracking-tight">
                {formatIDR(summary.cashOnHand)}
              </h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zen-stone/60 flex items-center justify-between text-xs">
            <span className="text-zen-muted">Physical Drawer Share</span>
            <span className="font-semibold text-zen-bark">
              {summary.totalSales > 0
                ? `${Math.round((summary.cashOnHand / summary.totalSales) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: GC Payment (Gift Certificate Redemptions) */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-purple-200/70 shadow-zen hover:shadow-zen-hover transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider mb-1">
                GC Payment
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-purple-900 tracking-tight">
                {formatIDR(summary.gcPayment || 0)}
              </h3>
            </div>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl border border-purple-200 group-hover:scale-110 transition-transform">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zen-stone/60 flex items-center justify-between text-xs">
            <span className="text-zen-muted">Vouchers Redeemed</span>
            <span className="font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/50">
              {summary.gcPaymentCount || 0} vouchers
            </span>
          </div>
        </div>

        {/* Card 4: Active Check-ins (Hidden in Periodic mode) */}
        {!isPeriodic && (
          <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-zen-sand/40 shadow-zen hover:shadow-zen-hover transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-zen-muted uppercase tracking-wider mb-1">
                  Active In-Service
                </p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-zen-charcoal tracking-tight flex items-baseline">
                  {summary.activeCheckIns}
                  <span className="text-xs font-normal text-zen-muted ml-1.5">guests</span>
                </h3>
              </div>
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-zen-stone/60 flex items-center justify-between text-xs">
              <span className="text-zen-muted flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Live in Rooms
              </span>
              <span className="font-semibold text-emerald-700">Currently Serving</span>
            </div>
          </div>
        )}

        {/* Card 5: Completed Transactions */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-zen-sand/40 shadow-zen hover:shadow-zen-hover transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-zen-muted uppercase tracking-wider mb-1">
                Completed
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-zen-charcoal tracking-tight flex items-baseline">
                {summary.completedTransactions}
                <span className="text-xs font-normal text-zen-muted ml-1.5">orders</span>
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zen-stone/60 flex items-center justify-between text-xs">
            <span className="text-zen-muted flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Rejections
            </span>
            <span className="font-semibold text-amber-700">
              {summary.totalRejections} walk-ins
            </span>
          </div>
        </div>

      </div>

      {/* Services & Products Operational Mix (ot_pos_trans_detail) */}
      <div className="bg-white rounded-2xl p-5 border border-zen-sand/40 shadow-zen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zen-stone/60">
          <div>
            <h3 className="text-sm font-bold text-zen-charcoal flex items-center gap-2">
              <Layers className="w-4 h-4 text-zen-matcha" />
              <span>Services & Products Breakdown</span>
            </h3>
            <p className="text-[11px] text-zen-muted">
              Granular detail counts of services, treatments, retail products, and gift certificates
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-semibold text-zen-moss bg-zen-paper px-3 py-1 rounded-full border border-zen-sand/40">
            Total {categoryMix.total.toLocaleString('id-ID')} item layanan & produk
          </span>
        </div>

        {/* 5 Operational Categories Grid (Foot & Body BJ, Additional BA, Product BP, GC Sales BG & GC Payment GCP) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {/* 1. Foot & Body (BJ) */}
          <div className="p-3.5 rounded-xl bg-zen-paper/70 border border-zen-sand/30 hover:border-zen-matcha/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zen-muted">Foot & Body</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zen-matcha/15 text-zen-moss">BJ</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-zen-charcoal">
              {categoryMix.footAndBody}
            </p>
            <span className="text-[10px] text-zen-muted">treatments</span>
          </div>

          {/* 2. Additional (BA) */}
          <div className="p-3.5 rounded-xl bg-zen-paper/70 border border-zen-sand/30 hover:border-zen-matcha/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zen-muted">Additional</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700">BA</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-zen-charcoal">
              {categoryMix.additional}
            </p>
            <span className="text-[10px] text-zen-muted">add-ons</span>
          </div>

          {/* 3. Product (BP) */}
          <div className="p-3.5 rounded-xl bg-zen-paper/70 border border-zen-sand/30 hover:border-zen-matcha/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zen-muted">Product</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-700">BP</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-zen-charcoal">
              {categoryMix.product}
            </p>
            <span className="text-[10px] text-zen-muted">retail units</span>
          </div>

          {/* 4. GC Sales (BG) */}
          <div className="p-3.5 rounded-xl bg-zen-paper/70 border border-zen-sand/30 hover:border-zen-matcha/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zen-muted">GC Sales</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-700">BG</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-zen-charcoal">
              {categoryMix.gcSales}
            </p>
            <span className="text-[10px] text-zen-muted">vouchers sold</span>
          </div>

          {/* 5. GC Payment (Redeemed) */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 hover:border-purple-400 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">GC Payment</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-200/80 text-purple-900">GCP</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-purple-900">
              {summary.gcPaymentCount || 0}
            </p>
            <span className="text-[10px] font-medium text-purple-700 truncate block" title={formatIDR(summary.gcPayment || 0)}>
              {formatIDR(summary.gcPayment || 0)}
            </span>
          </div>
        </div>

        {/* Treatments & Products Ranking (exclude null) - Complete Catalog Sorted by QTY */}
        {topItems.length > 0 && (
          <div className="pt-3 border-t border-zen-stone/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-zen-muted mb-2.5 font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zen-matcha" />
                <span className="font-bold text-zen-charcoal">
                  {isPeriodic ? 'Semua Layanan & Produk Periode (Exclude Null)' : 'All Treatments & Products Today (Exclude Null)'}
                </span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zen-moss bg-zen-paper px-2.5 py-0.5 rounded-full border border-zen-sand/40 self-start sm:self-auto">
                Total {topItems.length} Items • Ranked by QTY
              </span>
            </div>
            
            <div className="max-h-80 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {topItems.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-zen-paper/60 border border-zen-sand/30 hover:border-zen-matcha/40 hover:bg-white transition-all text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center bg-white text-[10px] font-mono font-bold text-zen-moss border border-zen-sand/40 flex-shrink-0 shadow-2xs">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-zen-charcoal truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="ml-2 font-mono font-bold text-zen-moss bg-white px-2 py-0.5 rounded-lg border border-zen-sand/30 flex-shrink-0 shadow-2xs">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
