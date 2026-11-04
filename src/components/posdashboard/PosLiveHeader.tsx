import React, { useState, useEffect } from 'react';
import { MasterOutlet } from '@/types/posdashboard';
import {
  RefreshCw,
  Clock,
  Calendar,
  Building2,
  Activity,
  Moon
} from 'lucide-react';
import { getWIBLiveClockString } from '@/lib/dateUtils';

interface PosLiveHeaderProps {
  outlets: MasterOutlet[];
  selectedOutlet: string;
  onSelectOutlet: (code: string) => void;
  countdown: number;
  onRefresh: () => void;
  loading: boolean;
  lastUpdated?: Date | null;
  selectedDate: string;
  isOvernightWindow?: boolean;
}

export const PosLiveHeader: React.FC<PosLiveHeaderProps> = ({
  outlets,
  selectedOutlet,
  onSelectOutlet,
  countdown,
  onRefresh,
  loading,
  lastUpdated,
  selectedDate,
  isOvernightWindow = false,
}) => {
  const [liveClock, setLiveClock] = useState<string>(() => getWIBLiveClockString());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(getWIBLiveClockString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <header className="bg-white dark:bg-zen-stone rounded-2xl border border-zen-border/80 shadow-xs p-4 sm:p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Page Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-zen-matcha flex items-center justify-center text-white shadow-xs shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-zen-charcoal tracking-tight">
                POS Dashboard — Laporan Langsung
              </h1>
              <span className="flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                LIVE WIB
              </span>
            </div>
            <p className="text-xs text-zen-muted font-medium mt-0.5">
              Pemantauan performa kasir POS, kapasitas kamar, terapis, dan likuiditas cabang hari ini
            </p>
          </div>
        </div>

        {/* Right: Controls & Clocks */}
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

          {/* Operational Shift Date Indicator */}
          <div className="flex items-center space-x-2 bg-zen-linen/80 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zen-border text-xs">
            <Calendar className="w-3.5 h-3.5 text-zen-moss" />
            <span className="font-semibold text-zen-charcoal">
              {formatDateDisplay(selectedDate)}
            </span>
            {isOvernightWindow && (
              <span className="flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Moon className="w-2.5 h-2.5 mr-0.5" /> Shift Malam
              </span>
            )}
          </div>

          {/* Live WIB Clock */}
          <div className="flex items-center space-x-1.5 bg-zen-linen/80 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zen-border font-mono text-xs font-bold text-zen-moss">
            <Clock className="w-3.5 h-3.5 text-zen-moss" />
            <span>{liveClock} WIB</span>
          </div>

          {/* Refresh Countdown & Action */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-zen-matcha hover:bg-zen-moss text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-95"
            title={lastUpdated ? `Terakhir disinkronkan: ${lastUpdated.toLocaleTimeString('id-ID')} WIB` : 'Klik untuk menyinkronkan data langsung dari Supabase'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Memuat...' : `Refresh (${countdown}s)`}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
