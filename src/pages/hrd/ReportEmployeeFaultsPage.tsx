import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Download,
  FileWarning,
  Filter,
  Info,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Sidebar';
import { useAuthUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { hrdFaultService } from '@/services/hrdFaultService';
import type { FaultCategory, HrdKpiFault } from '@/types/hrd';
import type { MasterOutlet } from '@/types/database';
import { printReportA4 } from '@/utils/reportPrintUtils';

const getWibDateString = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
};

const formatDateId = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTimeId = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCategoryBadgeClass = (kategori?: string | null): string => {
  switch (kategori) {
    case 'Ringan':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Sedang':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Berat':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const ReportEmployeeFaultsPage: React.FC = () => {
  const { user } = useAuthUser();
  const userRole = Number(user?.user_role || 0);
  const userOutletCode = user?.kode_outlet || '';
  const isOutletRestricted = [6, 14].includes(userRole);
  const isOnlyAdminEmployee = userRole === 6;
  const canCreateFault = [2, 5, 6, 8, 14].includes(userRole);

  const [outlets, setOutlets] = useState<Partial<MasterOutlet>[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(() => getWibDateString(-30));
  const [endDate, setEndDate] = useState<string>(() => getWibDateString(0));
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FaultCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [faults, setFaults] = useState<HrdKpiFault[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOutletRestricted && userOutletCode) {
      setSelectedOutlet(userOutletCode);
    }
  }, [isOutletRestricted, userOutletCode]);

  const loadOutlets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('master_outlet')
        .select('kode_outlet, name_outlet, city, province, alamat, no_telp, active, can_sto')
        .or('active.eq.true,can_sto.eq.true')
        .order('kode_outlet', { ascending: true });

      if (error) throw error;
      setOutlets((data || []) as Partial<MasterOutlet>[]);
    } catch (err) {
      console.error('Gagal memuat daftar cabang/outlet:', err);
    }
  }, []);

  useEffect(() => {
    void loadOutlets();
  }, [loadOutlets]);

  const effectiveOutlet = isOutletRestricted ? userOutletCode : selectedOutlet;

  const fetchFaults = useCallback(async () => {
    if (!user) return;
    if (isOutletRestricted && !userOutletCode) {
      setFaults([]);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await hrdFaultService.getKpiFaults({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        kodeOutlet: effectiveOutlet && effectiveOutlet !== 'ALL' ? effectiveOutlet : undefined,
        kategori: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        onlyAdmin: isOnlyAdminEmployee,
      });
      setFaults(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat laporan kesalahan karyawan.';
      setErrorMessage(msg);
      setFaults([]);
    } finally {
      setLoading(false);
    }
  }, [user, isOutletRestricted, userOutletCode, startDate, endDate, effectiveOutlet, selectedCategory, isOnlyAdminEmployee]);

  useEffect(() => {
    void fetchFaults();
  }, [fetchFaults]);

  const filteredFaults = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return faults;
    return faults.filter((item) => {
      const haystack = [
        item.namakaryawan,
        item.kodekaryawan,
        item.idkaryawan,
        item.departemen,
        item.nama_faults,
        item.kategori,
        item.keterangan,
        item.name_outlet,
        item.kode_outlet,
        item.update_by_name,
        item.created_by_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [faults, searchQuery]);

  const summary = useMemo(() => {
    let totalPoints = 0;
    let ringanCount = 0;
    let ringanPoints = 0;
    let sedangCount = 0;
    let sedangPoints = 0;
    let beratCount = 0;
    let beratPoints = 0;

    for (const row of filteredFaults) {
      const pts = Number(row.pengurang || 0);
      totalPoints += pts;
      if (row.kategori === 'Ringan') {
        ringanCount += 1;
        ringanPoints += pts;
      } else if (row.kategori === 'Sedang') {
        sedangCount += 1;
        sedangPoints += pts;
      } else if (row.kategori === 'Berat') {
        beratCount += 1;
        beratPoints += pts;
      }
    }

    return {
      totalIncidents: filteredFaults.length,
      totalPoints,
      ringanCount,
      ringanPoints,
      sedangCount,
      sedangPoints,
      beratCount,
      beratPoints,
    };
  }, [filteredFaults]);

  const selectedOutletObj = useMemo(
    () => outlets.find((o) => o.kode_outlet === effectiveOutlet) || null,
    [outlets, effectiveOutlet]
  );

  const handleExportCsv = () => {
    if (filteredFaults.length === 0) return;

    const escapeCsv = (val: unknown): string => {
      const str = String(val ?? '');
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'No',
      'Tanggal',
      'Kode Outlet',
      'Nama Cabang',
      'Kode Karyawan',
      'ID Karyawan',
      'Nama Karyawan',
      'Departemen',
      'Jenis Kesalahan',
      'Kategori',
      'Poin Pengurang',
      'Keterangan',
      'Dicatat / Diubah Oleh',
      'Waktu Update',
    ];

    const rows = filteredFaults.map((item, idx) => [
      idx + 1,
      item.tanggal || '-',
      item.kode_outlet || '-',
      item.name_outlet || '-',
      item.kodekaryawan || '-',
      item.idkaryawan || '-',
      item.namakaryawan || '-',
      item.departemen || '-',
      item.nama_faults || '-',
      item.kategori || '-',
      Number(item.pengurang || 0),
      item.keterangan || '-',
      item.update_by_name || item.created_by_name || '-',
      item.update_at || item.created_at || '-',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Kesalahan_Karyawan_${startDate || 'awal'}_sd_${endDate || 'akhir'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintA4 = async () => {
    if (filteredFaults.length === 0) return;
    setPrinting(true);
    try {
      await printReportA4({
        title: 'LAPORAN KESALAHAN KARYAWAN (NON-TR/TB)',
        subtitle: 'Rekapitulasi insiden kesalahan dan poin pengurang KPI karyawan aktif non-TR/TB.',
        canSelectOutlet: !isOutletRestricted,
        selectedOutlet: effectiveOutlet || userOutletCode || 'ALL',
        userOutletCode,
        availableOutlets: outlets,
        startDate,
        endDate,
        statusLabel:
          selectedCategory === 'ALL' ? 'Semua Kategori' : `Kategori: ${selectedCategory}`,
        extraFilters: [
          ...(isOnlyAdminEmployee
            ? [{ label: 'Filter Karyawan', value: 'Admin Cabang (isadmin = Y)' }]
            : []),
          ...(searchQuery.trim()
            ? [{ label: 'Pencarian', value: searchQuery.trim() }]
            : []),
        ],
        summaryItems: [
          { label: 'Total Insiden', value: String(summary.totalIncidents) },
          { label: 'Total Poin Pengurang', value: `-${summary.totalPoints} Poin` },
          {
            label: 'Ringan / Sedang / Berat',
            value: `${summary.ringanCount} / ${summary.sedangCount} / ${summary.beratCount}`,
          },
        ],
        columns: [
          { header: 'No', width: '4%', align: 'center' },
          { header: 'Tanggal', width: '9%', align: 'center' },
          { header: 'Cabang', width: '11%', align: 'left' },
          { header: 'Karyawan', width: '14%', align: 'left' },
          { header: 'Departemen', width: '10%', align: 'left' },
          { header: 'Jenis Kesalahan', width: '15%', align: 'left' },
          { header: 'Kategori', width: '8%', align: 'center' },
          { header: 'Poin', width: '6%', align: 'right' },
          { header: 'Keterangan', width: '13%', align: 'left' },
          { header: 'Dicatat Oleh', width: '10%', align: 'left' },
        ],
        rows: filteredFaults.map((item, idx) => [
          String(idx + 1),
          formatDateId(item.tanggal),
          `${item.kode_outlet}${item.name_outlet ? ` - ${item.name_outlet}` : ''}`,
          `${item.namakaryawan || '-'} (${item.kodekaryawan || item.idkaryawan || '-'})`,
          item.departemen || '-',
          item.nama_faults || '-',
          item.kategori || '-',
          `-${Number(item.pengurang || 0)}`,
          item.keterangan || '-',
          item.update_by_name || item.created_by_name || '-',
        ]),
        signatures: [
          { title: 'Dicetak Oleh', name: user?.full_name || user?.email || '-' },
          { title: 'Mengetahui (HRD / Pimpinan)', name: '________________________' },
        ],
      });
    } catch (err) {
      console.error('Gagal menyiapkan pratinjau cetak A4:', err);
      setErrorMessage('Gagal menyiapkan pratinjau cetak A4. Silakan coba kembali.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                <FileWarning className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Laporan Kesalahan Karyawan (Employee Faults)
                </h1>
                <p className="text-sm text-slate-500">
                  Rekapitulasi insiden kesalahan dan poin pengurang KPI karyawan non-TR/TB berdasarkan cabang &amp; periode.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isOutletRestricted && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  <Building2 className="h-3.5 w-3.5" />
                  Cabang Terkunci: {userOutletCode || '-'}
                  {selectedOutletObj ? ` (${selectedOutletObj.name_outlet})` : ''}
                </span>
              )}
              {isOnlyAdminEmployee && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                  <UserCheck className="h-3.5 w-3.5" />
                  Khusus Karyawan Admin Cabang (isadmin = Y)
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canCreateFault && (
              <Link
                to="/hrd/employee-faults"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4 text-indigo-600" />
                Input Kesalahan
              </Link>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredFaults.length === 0 || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </button>
            <button
              type="button"
              onClick={handlePrintA4}
              disabled={filteredFaults.length === 0 || loading || printing}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {printing ? 'Menyiapkan...' : 'Cetak Laporan A4'}
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Insiden
              </span>
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalIncidents}</p>
            <p className="mt-0.5 text-xs text-slate-500">Catatan kesalahan tampil</p>
          </div>

          <div className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Total Poin Pengurang
              </span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-700">-{summary.totalPoints}</p>
            <p className="mt-0.5 text-xs text-slate-500">Akumulasi poin penalti KPI</p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Kategori Ringan
              </span>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <Info className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{summary.ringanCount}</p>
            <p className="mt-0.5 text-xs text-slate-500">Total pengurang: -{summary.ringanPoints} poin</p>
          </div>

          <div className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-700">
                Kategori Sedang
              </span>
              <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-orange-700">{summary.sedangCount}</p>
            <p className="mt-0.5 text-xs text-slate-500">Total pengurang: -{summary.sedangPoints} poin</p>
          </div>

          <div className="rounded-2xl border border-red-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
                Kategori Berat
              </span>
              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-700">{summary.beratCount}</p>
            <p className="mt-0.5 text-xs text-slate-500">Total pengurang: -{summary.beratPoints} poin</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Filter className="h-4 w-4 text-indigo-600" />
              Filter Data Laporan
            </div>
            <button
              type="button"
              onClick={() => void fetchFaults()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Cabang / Outlet */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Cabang / Outlet
              </label>
              <select
                value={effectiveOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                disabled={isOutletRestricted}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              >
                {!isOutletRestricted && <option value="ALL">SEMUA OUTLET (NASIONAL)</option>}
                {outlets.map((outlet) => (
                  <option key={outlet.kode_outlet} value={outlet.kode_outlet}>
                    {outlet.kode_outlet} - {outlet.name_outlet}
                    {outlet.active === false && outlet.can_sto ? ' (STO)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal Mulai */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Tanggal Akhir */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Kategori Kesalahan */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                Kategori Kesalahan
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as 'ALL' | FaultCategory)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
              </select>
            </div>

            {/* Pencarian */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                Pencarian Cepat
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama, kode, departemen, jenis..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Gagal Memuat Data</p>
              <p className="mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center">
            <h2 className="text-sm font-semibold text-slate-800">
              Daftar Catatan Kesalahan Karyawan
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Menampilkan {filteredFaults.length} data
              {faults.length !== filteredFaults.length ? ` (dari total ${faults.length} data)` : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5 text-center">No</th>
                  <th className="px-4 py-3.5">Tanggal</th>
                  <th className="px-4 py-3.5">Cabang / Outlet</th>
                  <th className="px-4 py-3.5">Karyawan</th>
                  <th className="px-4 py-3.5">Departemen</th>
                  <th className="px-4 py-3.5">Jenis Kesalahan</th>
                  <th className="px-4 py-3.5 text-center">Kategori</th>
                  <th className="px-4 py-3.5 text-right">Poin Pengurang</th>
                  <th className="px-4 py-3.5">Keterangan</th>
                  <th className="px-4 py-3.5">Dicatat / Diubah Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                        <span>Memuat laporan kesalahan karyawan...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredFaults.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileWarning className="h-8 w-8 text-slate-300" />
                        <p className="font-medium text-slate-700">
                          Tidak ada catatan kesalahan karyawan pada filter yang dipilih.
                        </p>
                        <p className="text-xs text-slate-400">
                          Ubah rentang tanggal, cabang, kategori, atau kata kunci pencarian.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFaults.map((item, index) => (
                    <tr key={item.uid} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 text-center font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-800">
                        {formatDateId(item.tanggal)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{item.kode_outlet}</div>
                        <div className="text-xs text-slate-500">{item.name_outlet || '-'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {item.namakaryawan || '-'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span>Kode: {item.kodekaryawan || '-'}</span>
                          {item.idkaryawan && <span>• ID: {item.idkaryawan}</span>}
                          {item.isadmin === 'Y' && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {item.departemen || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {item.nama_faults || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryBadgeClass(
                            item.kategori
                          )}`}
                        >
                          {item.kategori || '-'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-rose-600">
                        -{Number(item.pengurang || 0)}
                      </td>
                      <td className="max-w-xs px-4 py-3.5 text-xs text-slate-600">
                        <p className="line-clamp-2" title={item.keterangan || ''}>
                          {item.keterangan || '-'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="text-xs font-medium text-slate-800">
                          {item.update_by_name || item.created_by_name || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDateTimeId(item.update_at || item.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportEmployeeFaultsPage;
