import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { usePosLiveDashboardData } from '@/hooks/usePosLiveDashboardData';
import { PosLiveHeader } from '@/components/posdashboard/PosLiveHeader';
import { ZenGardenSummary } from '@/components/posdashboard/ZenGardenSummary';
import { RoomTherapistAnalysis } from '@/components/posdashboard/RoomTherapistAnalysis';
import { OutletPanoramaGrid } from '@/components/posdashboard/OutletPanoramaGrid';
import { FinancePromoAnalysis } from '@/components/posdashboard/FinancePromoAnalysis';
import { RejectionAnalysis } from '@/components/posdashboard/RejectionAnalysis';
import { AlertCircle } from 'lucide-react';

export function PosLiveDashboardPage() {
  const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL');

  const {
    loading,
    error,
    lastUpdated,
    summary,
    outlets,
    paymentBreakdown,
    promoImpact,
    rejectionReasons,
    allActiveOutlets,
    countdown,
    refresh,
    selectedDate,
    isOvernightWindow,
  } = usePosLiveDashboardData(selectedOutlet);

  const selectedOutletObj = allActiveOutlets.find(
    (o) => o.kode_outlet === selectedOutlet
  );
  const selectedOutletName =
    selectedOutlet === 'ALL'
      ? 'Seluruh Jaringan Cabang Aktif'
      : selectedOutletObj
      ? `${selectedOutletObj.kode_outlet} - ${selectedOutletObj.name_outlet}`
      : 'Cabang Terpilih';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Live Header with Clock & Auto-Refresh */}
        <PosLiveHeader
          outlets={allActiveOutlets}
          selectedOutlet={selectedOutlet}
          onSelectOutlet={setSelectedOutlet}
          countdown={countdown}
          onRefresh={refresh}
          loading={loading}
          lastUpdated={lastUpdated}
          selectedDate={selectedDate}
          isOvernightWindow={isOvernightWindow}
        />

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <span className="font-bold">Pemberitahuan Sinkronisasi:</span> {error}
              </div>
            </div>
            <button
              onClick={refresh}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && !lastUpdated ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-40 bg-white/70 dark:bg-zinc-800 rounded-2xl border border-zen-sand/30"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-white/70 dark:bg-zinc-800 rounded-2xl border border-zen-sand/30"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-white/70 dark:bg-zinc-800 rounded-2xl border border-zen-sand/30"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 1. Zen Family Spa & Reflexology Primary KPI Summary */}
            <ZenGardenSummary
              summary={summary}
              selectedOutletName={selectedOutletName}
              selectedOutletCode={selectedOutlet}
              onResetOutlet={() => setSelectedOutlet('ALL')}
            />

            {/* 2. Human Resources On-Duty Staff & Room/Therapist Capacity Analytics */}
            <RoomTherapistAnalysis
              hrMetrics={summary.hrMetrics}
              roomMetrics={summary.roomMetrics}
              therapistMetrics={summary.therapistMetrics}
              selectedOutletName={selectedOutletName}
              selectedOutletCode={selectedOutlet}
            />

            {/* 3. Outlet Panorama Grid (Progress, Services Mix, Rejections) */}
            <OutletPanoramaGrid
              outlets={outlets}
              selectedOutletCode={selectedOutlet}
              onSelectOutlet={setSelectedOutlet}
            />

            {/* 4. Finance & Promotions Matrix */}
            <FinancePromoAnalysis
              paymentBreakdown={paymentBreakdown}
              promoImpact={promoImpact}
              totalSales={summary.totalSales}
              totalDiscounts={summary.totalDiscounts}
            />

            {/* 5. Walk-in Rejection Analysis */}
            <RejectionAnalysis
              reasons={rejectionReasons}
              totalRejections={summary.totalRejections}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default PosLiveDashboardPage;
