import React from 'react';
import { MasterOutlet } from '@/types/posdashboard';
import {
  Building2,
  CalendarRange,
  Search,
} from 'lucide-react';

interface PosPeriodicHeaderProps {
  outlets: MasterOutlet[];
  selectedOutlet: string;
  onSelectOutlet: (code: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onGenerate: () => void;
  loading: boolean;
  totalDays: number;
}

export const PosPeriodicHeader: React.FC<PosPeriodicHeaderProps> = ({
  outlets,
  selectedOutlet,
  onSelectOutlet,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  loading,
  totalDays,
}) => {
  // Quick Presets Helper
  const applyPreset = (preset: 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'today') {
      const todayStr = formatYMD(now);
      onStartDateChange(todayStr);
      onEndDateChange(todayStr);
    } else if (preset === 'last7') {
      const prior = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      onStartDateChange(formatYMD(prior));
      onEndDateChange(formatYMD(now));
    } else if (preset === 'last30') {
      const prior = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      onStartDateChange(formatYMD(prior));
      onEndDateChange(formatYMD(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      onStartDateChange(formatYMD(firstDay));
      onEndDateChange(formatYMD(now));
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      onStartDateChange(formatYMD(firstDay));
      onEndDateChange(formatYMD(lastDay));
    }
  };

  return (
    <header className="bg-white dark:bg-zen-stone rounded-2xl border border-zen-border/80 shadow-xs p-4 sm:p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal tracking-tight">
                POS Dashboard — Laporan Berkala
              </h1>
              <span className="flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                HISTORIKAL {totalDays} HARI
              </span>
            </div>
            <p className="text-xs text-zen-muted font-medium mt-0.5">
              Analisis performa pendapatan kasir POS, bauran produk/treatment, dan utilisasi cabang per rentang tanggal
            </p>
          </div>
        </div>

        {/* Right: Outlet Dropdown & Generate Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Branch Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-zen-linen/80 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zen-border">
            <Building2 className="w-3.5 h-3.5 text-zen-muted" />
            <select
              value={selectedOutlet}
              onChange={(e) => onSelectOutlet(e.target.value)}
              className="text-xs font-bold text-zen-charcoal bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Semua Cabang (All Outlets)</option>
              {outlets.map((o) => (
                <option key={o.kode_outlet} value={o.kode_outlet}>
                  {o.kode_outlet} - {o.name_outlet}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onGenerate}
            disabled={loading}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-zen-matcha hover:bg-zen-moss text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-95"
          >
            <Search className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Memuat Data...' : 'Tampilkan Laporan'}</span>
          </button>
        </div>
      </div>

      {/* Date Range Bar & Quick Presets */}
      <div className="mt-4 pt-4 border-t border-zen-stone/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Inputs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-zen-muted">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-zen-border bg-zen-linen/50 dark:bg-zinc-800 font-semibold text-zen-charcoal focus:outline-none focus:ring-2 focus:ring-zen-matcha"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-zen-muted">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-zen-border bg-zen-linen/50 dark:bg-zinc-800 font-semibold text-zen-charcoal focus:outline-none focus:ring-2 focus:ring-zen-matcha"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-zen-muted text-[11px] font-medium mr-1 hidden sm:inline">Pilihan Cepat:</span>
          <button
            type="button"
            onClick={() => applyPreset('today')}
            className="px-2.5 py-1 rounded-lg bg-zen-linen hover:bg-zen-sand/40 border border-zen-border text-[11px] font-semibold text-zen-charcoal transition-colors"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last7')}
            className="px-2.5 py-1 rounded-lg bg-zen-linen hover:bg-zen-sand/40 border border-zen-border text-[11px] font-semibold text-zen-charcoal transition-colors"
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => applyPreset('thisMonth')}
            className="px-2.5 py-1 rounded-lg bg-zen-linen hover:bg-zen-sand/40 border border-zen-border text-[11px] font-semibold text-zen-charcoal transition-colors"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset('lastMonth')}
            className="px-2.5 py-1 rounded-lg bg-zen-linen hover:bg-zen-sand/40 border border-zen-border text-[11px] font-semibold text-zen-charcoal transition-colors"
          >
            Bulan Lalu
          </button>
        </div>
      </div>
    </header>
  );
};
