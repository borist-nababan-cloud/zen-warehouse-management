import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MasterOutlet,
  PosTransMaster,
  PosPaymentDetails,
  PosTransReject,
  PosTransDetail,
  CategoryMix,
  ItemRankItem,
  OutletCardMetrics,
  PaymentMethodItem,
  PromoImpactItem,
  RejectionReasonItem,
  GlobalGardenSummary,
  OutletHRMetrics,
  OutletRoomMetrics,
  OutletTherapistMetrics,
} from '@/types/posdashboard';

const DEFAULT_DAILY_TARGET = 5000000; // Rp 5.000.000 / hari jika belum diset di master_outlet_sales_targets

const createEmptyCategoryMix = (): CategoryMix => ({
  footAndBody: 0,
  additional: 0,
  product: 0,
  gcSales: 0,
  total: 0,
});

const createEmptyHRMetrics = (): OutletHRMetrics => ({
  totalActiveStaff: 0,
  activeTR: 0,
  activeTB: 0,
  departments: [],
});

const createEmptyRoomMetrics = (): OutletRoomMetrics => ({
  totalRooms: 0,
  roomsBM: 0,
  roomsRF: 0,
  usedRooms: 0,
  usedBM: 0,
  usedRF: 0,
  availableRooms: 0,
  availableBM: 0,
  availableRF: 0,
  occupancyPercent: 0,
  cumulativeTurnover: 0,
});

const createEmptyTherapistMetrics = (): OutletTherapistMetrics => ({
  inChargeTR: 0,
  inChargeTB: 0,
  totalInCharge: 0,
  onTreatmentRF: 0,
  onTreatmentBM: 0,
  totalOnTreatment: 0,
  availableTR: 0,
  availableTB: 0,
  totalAvailable: 0,
  utilizationPercent: 0,
  cumulativeProductivity: 0,
});

// Helper to fetch all rows paginated in chunks of 1000
async function fetchAllPaginated<T>(
  queryBuilder: any,
  batchSize: number = 1000
): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder.range(from, from + batchSize - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      all = all.concat(data);
      if (data.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }
    } else {
      hasMore = false;
    }
  }
  return all;
}

export function usePosPeriodicDashboardData(
  selectedOutletCode: string = 'ALL',
  initialStartDate?: string,
  initialEndDate?: string
) {
  // Default to last 7 days
  const today = new Date();
  const prior7 = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string>(initialStartDate || formatYMD(prior7));
  const [endDate, setEndDate] = useState<string>(initialEndDate || formatYMD(today));

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Compute number of days in the selected range
  const totalDays = useMemo(() => {
    try {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  }, [startDate, endDate]);

  const [summary, setSummary] = useState<GlobalGardenSummary>({
    totalSales: 0,
    totalTargetSales: 0,
    targetProgressPercent: 0,
    cashOnHand: 0,
    gcPayment: 0,
    gcPaymentCount: 0,
    activeCheckIns: 0,
    completedTransactions: 0,
    totalDiscounts: 0,
    totalPromos: 0,
    totalRejections: 0,
    categoryMix: createEmptyCategoryMix(),
    topItems: [],
    hrMetrics: createEmptyHRMetrics(),
    roomMetrics: createEmptyRoomMetrics(),
    therapistMetrics: createEmptyTherapistMetrics(),
  });

  const [outlets, setOutlets] = useState<OutletCardMetrics[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentMethodItem[]>([]);
  const [promoImpact, setPromoImpact] = useState<PromoImpactItem[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReasonItem[]>([]);
  const [allActiveOutlets, setAllActiveOutlets] = useState<MasterOutlet[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startYear = parseInt(startDate.slice(0, 4), 10) || new Date().getFullYear();
      const endYear = parseInt(endDate.slice(0, 4), 10) || startYear;
      const targetYears = Array.from(new Set([startYear, endYear]));

      // Execute paginated queries in parallel without row truncation
      const [
        outletsRes,
        rawMasters,
        rawDetails,
        rawPayments,
        rawGcPayments,
        rawRejects,
        targetsRes,
      ] = await Promise.all([
        // 1. Active Outlets
        supabase
          .from('master_outlet')
          .select('kode_outlet, name_outlet, alamat, no_telp, city, province, active')
          .eq('active', true)
          .order('kode_outlet', { ascending: true }),

        // 2. POS Trans Master (Paginated)
        fetchAllPaginated<PosTransMaster>(
          supabase
            .from('ot_pos_trans_master')
            .select('trans_id, kode_outlet, tanggal, start_time, end_time, status_trans, nama_customer, room_id, subtotal, kodekaryawan, byrequest, typejasa, rcpt, id_payment, user_uid')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .gte('subtotal', 0)
            .order('tanggal', { ascending: true })
        ),

        // 3. POS Trans Detail (Paginated)
        fetchAllPaginated<PosTransDetail>(
          supabase
            .from('ot_pos_trans_detail')
            .select('trans_id, kode_outlet, tanggal, trans_type_id, produk_jasa_id, produk_jasa_nama, qty, price, subtotal')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true })
        ),

        // 4. POS Trans Payment Details (Paginated)
        fetchAllPaginated<PosPaymentDetails>(
          supabase
            .from('ot_pos_trans_payment_details')
            .select('id_payment, kode_outlet, tanggal, namapromo, refpromo, vpromo, refdisc, vdisc, total, vredeem, refgift, vgift, vcash, payment1, bank1, refpayment1, vpayment1, payment2, bank2, refpayment2, vpayment2, rcpt, created_at')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true })
        ),

        // 5. GC Payments (Paginated)
        fetchAllPaginated<PosPaymentDetails>(
          supabase
            .from('ot_pos_trans_payment_details')
            .select('id_payment, kode_outlet, tanggal, namapromo, refpromo, vpromo, refdisc, vdisc, total, vredeem, refgift, vgift, vcash, payment1, bank1, refpayment1, vpayment1, payment2, bank2, refpayment2, vpayment2, rcpt, created_at')
            .gt('vgift', 0)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true })
        ),

        // 6. POS Trans Reject (Paginated)
        fetchAllPaginated<PosTransReject>(
          supabase
            .from('ot_pos_trans_reject')
            .select('local_autonum, kode_outlet, tanggal, jenis_jasa, reason, reject_date, lasteditdate')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
        ),

        // 7. Sales Targets
        supabase
          .from('master_outlet_sales_targets')
          .select('kode_outlet, year, target_harian')
          .in('year', targetYears),
      ]);

      if (outletsRes.error) throw new Error(`Outlets Error: ${outletsRes.error.message}`);

      const rawOutlets: MasterOutlet[] = (outletsRes.data as MasterOutlet[]) || [];

      // Combine payment records with deduplication by id_payment
      const paymentMap = new Map<string, PosPaymentDetails>();
      for (const p of rawPayments) {
        paymentMap.set(p.id_payment, p);
      }
      for (const p of rawGcPayments) {
        if (!paymentMap.has(p.id_payment)) {
          paymentMap.set(p.id_payment, p);
        }
      }

      // Ensure any payments referenced in masters are fully captured
      const missingPayIds = Array.from(
        new Set(
          rawMasters
            .map((m) => m.id_payment)
            .filter((id): id is string => typeof id === 'string' && id.length > 0 && !paymentMap.has(id))
        )
      );

      if (missingPayIds.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < missingPayIds.length; i += chunkSize) {
          const chunk = missingPayIds.slice(i, i + chunkSize);
          const { data: extraPayments } = await supabase
            .from('ot_pos_trans_payment_details')
            .select('id_payment, kode_outlet, tanggal, namapromo, refpromo, vpromo, refdisc, vdisc, total, vredeem, refgift, vgift, vcash, payment1, bank1, refpayment1, vpayment1, payment2, bank2, refpayment2, vpayment2, rcpt, created_at')
            .in('id_payment', chunk);
          if (extraPayments && extraPayments.length > 0) {
            for (const p of (extraPayments as PosPaymentDetails[])) {
              paymentMap.set(p.id_payment, p);
            }
          }
        }
      }

      // Targets lookup map
      const targetMap = new Map<string, number>();
      if (targetsRes && targetsRes.data) {
        for (const t of targetsRes.data) {
          targetMap.set(t.kode_outlet, Number(t.target_harian));
        }
      }

      // Initialize Outlet Metrics Map with SCALED Target Sales
      const outletMap = new Map<string, OutletCardMetrics>();
      for (const outlet of rawOutlets) {
        const dailyTarget = targetMap.get(outlet.kode_outlet) || DEFAULT_DAILY_TARGET;
        const scaledTarget = dailyTarget * totalDays;

        outletMap.set(outlet.kode_outlet, {
          outlet,
          totalSales: 0,
          cashOnHand: 0,
          gcPayment: 0,
          gcPaymentCount: 0,
          activeGuests: 0,
          completedGuests: 0,
          rejectionCount: 0,
          categoryMix: createEmptyCategoryMix(),
          topItems: [],
          targetSales: scaledTarget,
          progressPercent: 0,
          hrMetrics: createEmptyHRMetrics(),
          roomMetrics: createEmptyRoomMetrics(),
          therapistMetrics: createEmptyTherapistMetrics(),
        });
      }

      // Global Accumulators
      let globalCompletedTransactions = 0;
      let globalTotalSales = 0;
      let globalCashOnHand = 0;
      let globalGCPayment = 0;
      let globalGCPaymentCount = 0;
      let globalTotalDiscounts = 0;
      let globalTotalPromos = 0;
      let globalTotalRejections = 0;

      const globalCategoryMix = createEmptyCategoryMix();
      const globalItemCounts = new Map<string, number>();
      const outletItemMaps = new Map<string, Map<string, number>>();

      const methodMap = new Map<string, { total: number; count: number }>();
      const promoMap = new Map<string, { totalDiscount: number; usageCount: number }>();
      const reasonMap = new Map<string, { count: number; services: Set<string> }>();

      // 1. Process Trans Master (Count completed transactions only)
      for (const m of rawMasters) {
        if (!outletMap.has(m.kode_outlet)) continue;

        const subtotal = Number(m.subtotal) || 0;
        const statusUpper = (m.status_trans || '').trim().toUpperCase();
        const isCompleted = statusUpper === 'PAID' || statusUpper === 'CHECKOUT' || statusUpper === 'FINISHED';

        if (isCompleted && subtotal > 0) {
          const isTargetOutlet = selectedOutletCode === 'ALL' || m.kode_outlet === selectedOutletCode;
          const outletMetrics = outletMap.get(m.kode_outlet)!;
          outletMetrics.completedGuests += 1;

          if (isTargetOutlet) {
            globalCompletedTransactions += 1;
          }
        }
      }

      // 2. Process Trans Details (Treatments, Products, Additional, GC)
      for (const d of rawDetails) {
        if (!outletMap.has(d.kode_outlet)) continue;

        const isTargetOutlet = selectedOutletCode === 'ALL' || d.kode_outlet === selectedOutletCode;
        const outletMetrics = outletMap.get(d.kode_outlet)!;
        const qty = Number(d.qty) || 1;
        const typeId = (d.trans_type_id || '').toUpperCase();

        const updateMix = (mix: CategoryMix) => {
          if (typeId === 'BJ' || typeId.startsWith('BJ')) {
            mix.footAndBody += qty;
          } else if (typeId === 'BA' || typeId.startsWith('BA')) {
            mix.additional += qty;
          } else if (typeId === 'BP' || typeId.startsWith('BP')) {
            mix.product += qty;
          } else if (typeId === 'BG' || typeId.startsWith('BG')) {
            mix.gcSales += qty;
          }
          mix.total += qty;
        };

        updateMix(outletMetrics.categoryMix);
        if (isTargetOutlet) {
          updateMix(globalCategoryMix);
        }

        // Top Ranking Items
        const itemName = (d.produk_jasa_nama || 'Unknown Service').trim();
        if (itemName) {
          if (isTargetOutlet) {
            globalItemCounts.set(itemName, (globalItemCounts.get(itemName) || 0) + qty);
          }
          if (!outletItemMaps.has(d.kode_outlet)) {
            outletItemMaps.set(d.kode_outlet, new Map());
          }
          const oMap = outletItemMaps.get(d.kode_outlet)!;
          oMap.set(itemName, (oMap.get(itemName) || 0) + qty);
        }
      }

      // 3. Process Payments (Realized/Settled Revenue, Cash Drawer, Gift Certificates, Discounts)
      const allMergedPayments = Array.from(paymentMap.values());
      for (const p of allMergedPayments) {
        if (!outletMap.has(p.kode_outlet)) continue;

        const isTargetOutlet = selectedOutletCode === 'ALL' || p.kode_outlet === selectedOutletCode;
        const outletMetrics = outletMap.get(p.kode_outlet)!;

        const totalPay = Number(p.total) || 0;
        const vcash = Number(p.vcash) || 0;
        const vgift = Number(p.vgift) || 0;
        const vdisc = Number(p.vdisc) || 0;
        const vpromo = Number(p.vpromo) || 0;

        // Add settled revenue and cash drawer share to outlet
        outletMetrics.totalSales += totalPay;
        outletMetrics.cashOnHand += vcash;
        if (vgift > 0) {
          outletMetrics.gcPayment += vgift;
          outletMetrics.gcPaymentCount += 1;
        }

        if (isTargetOutlet) {
          globalTotalSales += totalPay;
          globalCashOnHand += vcash;
          if (vgift > 0) {
            globalGCPayment += vgift;
            globalGCPaymentCount += 1;
          }
          globalTotalDiscounts += vdisc;
          globalTotalPromos += vpromo;

          // Tender breakdown accumulation
          if (vcash > 0) {
            const entry = methodMap.get('CASH') || { total: 0, count: 0 };
            entry.total += vcash;
            entry.count += 1;
            methodMap.set('CASH', entry);
          }

          if (Number(p.vpayment1) > 0) {
            const m1 = (p.payment1 || p.bank1 || 'CARD').toUpperCase();
            const entry = methodMap.get(m1) || { total: 0, count: 0 };
            entry.total += Number(p.vpayment1);
            entry.count += 1;
            methodMap.set(m1, entry);
          }

          if (Number(p.vpayment2) > 0) {
            const m2 = (p.payment2 || p.bank2 || 'SPLIT_PAY').toUpperCase();
            const entry = methodMap.get(m2) || { total: 0, count: 0 };
            entry.total += Number(p.vpayment2);
            entry.count += 1;
            methodMap.set(m2, entry);
          }

          if (vgift > 0) {
            const entry = methodMap.get('GIFT_CARD') || { total: 0, count: 0 };
            entry.total += vgift;
            entry.count += 1;
            methodMap.set('GIFT_CARD', entry);
          }

          // Promo tracking
          const promoName = (p.namapromo || '').trim();
          if (promoName && (vpromo > 0 || vdisc > 0)) {
            const pr = promoMap.get(promoName) || { totalDiscount: 0, usageCount: 0 };
            pr.totalDiscount += vpromo + vdisc;
            pr.usageCount += 1;
            promoMap.set(promoName, pr);
          }
        }
      }

      // 4. Process Walk-in Rejections
      for (const r of rawRejects) {
        if (!outletMap.has(r.kode_outlet)) continue;

        const isTargetOutlet = selectedOutletCode === 'ALL' || r.kode_outlet === selectedOutletCode;
        const outletMetrics = outletMap.get(r.kode_outlet)!;
        outletMetrics.rejectionCount += 1;

        if (isTargetOutlet) {
          globalTotalRejections += 1;
          const reasonText = (r.reason || 'Kapasitas Penuh').trim();
          const svcType = (r.jenis_jasa || 'General').trim();
          if (!reasonMap.has(reasonText)) {
            reasonMap.set(reasonText, { count: 0, services: new Set() });
          }
          const item = reasonMap.get(reasonText)!;
          item.count += 1;
          item.services.add(svcType);
        }
      }

      // Finalize per-outlet progress & top items
      let globalTargetSales = 0;
      for (const outlet of rawOutlets) {
        const isTarget = selectedOutletCode === 'ALL' || outlet.kode_outlet === selectedOutletCode;
        if (isTarget) {
          const outletMetrics = outletMap.get(outlet.kode_outlet)!;
          const oItems = outletItemMaps.get(outlet.kode_outlet);
          if (oItems) {
            outletMetrics.topItems = Array.from(oItems.entries())
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count);
          }
          const target = outletMetrics.targetSales || (DEFAULT_DAILY_TARGET * totalDays);
          outletMetrics.targetSales = target;
          outletMetrics.progressPercent = target > 0 ? Math.min(100, Math.round((outletMetrics.totalSales / target) * 100)) : 0;
          globalTargetSales += target;
        }
      }

      const globalProgressPercent = globalTargetSales > 0 ? Math.min(100, Math.round((globalTotalSales / globalTargetSales) * 100)) : 0;

      // Global Top Items
      const globalTopItems: ItemRankItem[] = Array.from(globalItemCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setSummary({
        totalSales: globalTotalSales,
        totalTargetSales: globalTargetSales,
        targetProgressPercent: globalProgressPercent,
        cashOnHand: globalCashOnHand,
        gcPayment: globalGCPayment,
        gcPaymentCount: globalGCPaymentCount,
        activeCheckIns: 0,
        completedTransactions: globalCompletedTransactions,
        totalDiscounts: globalTotalDiscounts,
        totalPromos: globalTotalPromos,
        totalRejections: globalTotalRejections,
        categoryMix: globalCategoryMix,
        topItems: globalTopItems,
        hrMetrics: createEmptyHRMetrics(),
        roomMetrics: createEmptyRoomMetrics(),
        therapistMetrics: createEmptyTherapistMetrics(),
      });

      setOutlets(Array.from(outletMap.values()));
      setPaymentBreakdown(
        Array.from(methodMap.entries())
          .map(([method, data]) => ({ method, total: data.total, count: data.count }))
          .sort((a, b) => b.total - a.total)
      );
      setPromoImpact(
        Array.from(promoMap.entries())
          .map(([promoName, data]) => ({ promoName, totalDiscount: data.totalDiscount, usageCount: data.usageCount }))
          .sort((a, b) => b.totalDiscount - a.totalDiscount)
      );
      setRejectionReasons(
        Array.from(reasonMap.entries())
          .map(([reason, data]) => ({ reason, count: data.count, serviceTypes: Array.from(data.services) }))
          .sort((a, b) => b.count - a.count)
      );
      setAllActiveOutlets(rawOutlets);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('POS Periodic Dashboard Data Fetch Error:', err);
      setError(err.message || 'Gagal memuat data POS Periodic Dashboard');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedOutletCode, totalDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
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
    refresh: fetchData,
  };
}
