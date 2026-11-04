import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { usePosPeriodicDashboardData } from '@/hooks/usePosPeriodicDashboardData';
import { PosPeriodicHeader } from '@/components/posdashboard/PosPeriodicHeader';
import { ZenGardenSummary } from '@/components/posdashboard/ZenGardenSummary';
import { OutletPanoramaGrid } from '@/components/posdashboard/OutletPanoramaGrid';
import { FinancePromoAnalysis } from '@/components/posdashboard/FinancePromoAnalysis';
import { RejectionAnalysis } from '@/components/posdashboard/RejectionAnalysis';
import { AlertCircle } from 'lucide-react';

export function PosPeriodicDashboardPage() {
  const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL');

  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    totalDays,
    loading,
    error,
    lastUpdated,
    summary,
    outlets,
    paymentBreakdown,
    promoImpact,
    rejectionReasons,
    allActiveOutlets,
    refresh,
  } = usePosPeriodicDashboardData(selectedOutlet);

  const selectedOutletObj = allActiveOutlets.find(
    (o) => o.kode_outlet === selectedOutlet
  );
  const selectedOutletName =
    selectedOutlet === 'ALL'
      ? `Seluruh Jaringan Cabang Aktif (${totalDays} Hari)`
      : selectedOutletObj
      ? `${selectedOutletObj.kode_outlet} - ${selectedOutletObj.name_outlet} (${totalDays} Hari)`
      : `Cabang Terpilih (${totalDays} Hari)`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Periodic Header with Date Range Filter */}
        <PosPeriodicHeader
          outlets={allActiveOutlets}
          selectedOutlet={selectedOutlet}
          onSelectOutlet={setSelectedOutlet}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onGenerate={refresh}
          loading={loading}
          totalDays={totalDays}
        />

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <span className="font-bold">Pemberitahuan Kueri Periode:</span> {error}
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
              isPeriodic={true}
            />

            {/* 2. Outlet Panorama Grid (Progress vs Scaled Target, Services Mix, Rejections) */}
            <OutletPanoramaGrid
              outlets={outlets}
              selectedOutletCode={selectedOutlet}
              onSelectOutlet={setSelectedOutlet}
              isPeriodic={true}
            />

            {/* 3. Finance & Promotions Matrix */}
            <FinancePromoAnalysis
              paymentBreakdown={paymentBreakdown}
              promoImpact={promoImpact}
              totalSales={summary.totalSales}
              totalDiscounts={summary.totalDiscounts}
            />

            {/* 4. Walk-in Rejection Analysis */}
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

export default PosPeriodicDashboardPage;
