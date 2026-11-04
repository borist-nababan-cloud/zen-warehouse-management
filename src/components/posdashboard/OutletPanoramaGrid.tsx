import React from 'react';
import { OutletCardMetrics } from '@/types/posdashboard';
import { Store, UserCheck, AlertCircle, MapPin, Gift, DoorOpen, Users, Target } from 'lucide-react';

interface OutletPanoramaGridProps {
  outlets: OutletCardMetrics[];
  selectedOutletCode: string;
  onSelectOutlet: (code: string) => void;
  isPeriodic?: boolean;
}

export const OutletPanoramaGrid: React.FC<OutletPanoramaGridProps> = ({
  outlets,
  selectedOutletCode,
  onSelectOutlet,
  isPeriodic = false,
}) => {
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredList =
    selectedOutletCode === 'ALL'
      ? outlets
      : outlets.filter((o) => o.outlet.kode_outlet === selectedOutletCode);

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-zen-charcoal flex items-center gap-2">
            <Store className="w-5 h-5 text-zen-matcha" />
            <span>Zen Branch</span>
            <span className="text-xs font-sans font-medium text-zen-muted bg-white px-2 py-0.5 rounded-full border border-zen-sand/40">
              {filteredList.length} Outlets
            </span>
          </h2>
          <p className="text-xs text-zen-muted">
            {isPeriodic
              ? 'Ringkasan pendapatan, bauran produk/layanan, dan rejections per cabang'
              : 'Individual branch target progress, treatment & product mix, and floor occupancy'}
          </p>
        </div>
      </div>

      {/* Grid of Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.map((item) => {
          const {
            outlet,
            totalSales,
            targetSales = 0,
            gcPayment = 0,
            gcPaymentCount = 0,
            activeGuests,
            completedGuests,
            rejectionCount,
            categoryMix,
            topItems
          } = item;

          const achievementPercent = targetSales > 0 ? (totalSales / targetSales) * 100 : 0;

          return (
            <div
              key={outlet.kode_outlet}
              onClick={() => onSelectOutlet(outlet.kode_outlet)}
              className={`group bg-white rounded-2xl p-5 border transition-all duration-300 cursor-pointer relative overflow-hidden shadow-zen hover:shadow-zen-hover ${
                selectedOutletCode === outlet.kode_outlet
                  ? 'border-zen-matcha ring-2 ring-zen-matcha/30'
                  : 'border-zen-sand/40 hover:border-zen-matcha/60'
              }`}
            >
              {/* Header: Outlet Code & Name */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zen-paper flex items-center justify-center border border-zen-sand/40 text-xs font-mono font-bold text-zen-moss group-hover:bg-zen-matcha group-hover:text-white transition-colors">
                    {outlet.kode_outlet}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zen-charcoal group-hover:text-zen-moss transition-colors line-clamp-1">
                      {outlet.name_outlet}
                    </h3>
                    <p className="text-[11px] text-zen-muted flex items-center">
                      <MapPin className="w-3 h-3 mr-0.5 text-zen-sand" />
                      {outlet.city || outlet.province || 'Indonesia'}
                    </p>
                  </div>
                </div>

                {/* Live Activity Dot: Only shown in Live mode */}
                {!isPeriodic && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{activeGuests} Active</span>
                  </span>
                )}
              </div>

              {/* Metric A: Revenue & GC Payment Overview */}
              <div className="my-3 grid grid-cols-2 gap-2">
                <div className="p-3 bg-zen-paper/60 rounded-xl border border-zen-sand/30">
                  <span className="text-[10px] uppercase font-bold text-zen-muted tracking-wider block mb-0.5">
                    {isPeriodic ? 'Revenue Periode' : "Today's Revenue"}
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-zen-charcoal truncate" title={formatIDR(totalSales)}>
                    {formatIDR(totalSales)}
                  </p>
                </div>

                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/70">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider flex items-center gap-1">
                      <Gift className="w-3 h-3 text-purple-600" />
                      <span>GC Payment</span>
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-purple-200/70 text-purple-800">
                      {gcPaymentCount}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-purple-900 truncate" title={formatIDR(gcPayment)}>
                    {formatIDR(gcPayment)}
                  </p>
                </div>
              </div>

              {/* Target & Achievement Progress Bar */}
              {targetSales > 0 && (
                <div className="mb-3 p-2.5 bg-zen-paper/50 rounded-xl border border-zen-sand/30">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zen-muted flex items-center gap-1 text-[11px] font-medium">
                      <Target className="w-3.5 h-3.5 text-zen-matcha" />
                      <span>{isPeriodic ? 'Target Periode' : 'Target Harian'}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-zen-charcoal">
                        {formatIDR(targetSales)}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        achievementPercent >= 100
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : achievementPercent >= 75
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {achievementPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar Track */}
                  <div className="w-full bg-zen-stone/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        achievementPercent >= 100 ? 'bg-emerald-500' : 'bg-zen-matcha'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, Math.round(achievementPercent)))}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Metric B: Category Breakdown (BJ, BA, BP, BG) from ot_pos_trans_detail */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-zen-muted mb-1.5 font-medium">
                  <span>Treatment & Product Mix</span>
                  <span>{categoryMix.total} items</span>
                </div>

                {categoryMix.total > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {/* BJ */}
                    <div className="p-1 rounded bg-zen-cream/70 border border-zen-sand/30" title="Foot & Body">
                      <span className="block text-[9px] font-bold text-zen-muted">BJ</span>
                      <span className="text-xs font-extrabold text-zen-charcoal">{categoryMix.footAndBody}</span>
                    </div>
                    {/* BA */}
                    <div className="p-1 rounded bg-blue-50/80 border border-blue-100" title="Additional">
                      <span className="block text-[9px] font-bold text-blue-600">BA</span>
                      <span className="text-xs font-extrabold text-blue-900">{categoryMix.additional}</span>
                    </div>
                    {/* BP */}
                    <div className="p-1 rounded bg-amber-50/80 border border-amber-100" title="Product">
                      <span className="block text-[9px] font-bold text-amber-600">BP</span>
                      <span className="text-xs font-extrabold text-amber-900">{categoryMix.product}</span>
                    </div>
                    {/* BG */}
                    <div className="p-1 rounded bg-purple-50/80 border border-purple-100" title="GC Sales">
                      <span className="block text-[9px] font-bold text-purple-600">BG</span>
                      <span className="text-xs font-extrabold text-purple-900">{categoryMix.gcSales}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zen-muted italic py-1">
                    {isPeriodic ? 'Tidak ada transaksi layanan atau retail pada periode ini' : 'No services or retail sales yet today'}
                  </p>
                )}

                {/* Top Items preview for outlet */}
                {topItems && topItems.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zen-stone/40">
                    <div className="flex flex-wrap gap-1">
                      {topItems.slice(0, 2).map((ti) => (
                        <span
                          key={ti.name}
                          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-zen-paper border border-zen-sand/40 text-zen-charcoal truncate max-w-[200px]"
                          title={ti.name}
                        >
                          <span className="truncate">{ti.name}</span>
                          <span className="ml-1 font-mono font-bold text-zen-moss">x{ti.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Metric C: Staff & Room Live Capacity (Only shown in Live mode) */}
              {!isPeriodic && (item.hrMetrics?.totalActiveStaff || item.roomMetrics?.totalRooms) ? (
                <div className="pt-2 mb-2 flex items-center justify-between text-[11px] text-zen-muted border-t border-zen-stone/40">
                  <span className="flex items-center space-x-1" title="In-Charge Therapists: Foot (TR) & Body (TB)">
                    <Users className="w-3 h-3 text-zen-moss" />
                    <span className="font-semibold text-zen-charcoal">{item.therapistMetrics?.totalInCharge || 0} Therapists</span>
                    <span className="text-[10px] text-zen-muted">({item.hrMetrics?.activeTR || 0} TR / {item.hrMetrics?.activeTB || 0} TB)</span>
                  </span>
                  <span className="flex items-center space-x-1" title="Active Rooms & Available">
                    <DoorOpen className="w-3 h-3 text-zen-matcha" />
                    <span className="font-semibold text-zen-charcoal">{item.roomMetrics?.totalRooms || 0} Rooms</span>
                    <span className="text-[10px] font-bold text-emerald-700">({item.roomMetrics?.availableRooms || 0} Free)</span>
                  </span>
                </div>
              ) : null}

              {/* Metric D: Bottom of Card */}
              {isPeriodic ? (
                /* In Periodic mode: only display rejected count */
                <div className="pt-2 border-t border-zen-stone/60 flex items-center justify-between text-xs">
                  <span className="text-zen-muted text-[11px]">Walk-in Rejections</span>
                  <div className="flex items-center space-x-1 font-medium">
                    {rejectionCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                        {rejectionCount} Rejected
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-medium">
                        0 Walk-in Rejects
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* In Live mode: Guest Flow & Rejection Counter */
                <div className="pt-2 border-t border-zen-stone/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-zen-muted">
                    <UserCheck className="w-3.5 h-3.5 text-zen-matcha" />
                    <span>{completedGuests} Completed</span>
                  </div>

                  <div className="flex items-center space-x-1 font-medium">
                    {rejectionCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                        {rejectionCount} Rejected
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-medium">
                        0 Walk-in Rejects
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
