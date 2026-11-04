import { useState, useEffect, useCallback } from 'react';
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
  MasterRoom,
  HrdAbsenHarian,
  HrdKaryawanInfo,
  OutletHRMetrics,
  OutletRoomMetrics,
  OutletTherapistMetrics,
} from '@/types/posdashboard';
import { getAutoWIBOperationalDate } from '@/lib/dateUtils';

const DEFAULT_DAILY_TARGET = 5000000; // Rp 5.000.000 / hari jika belum diset di master_outlet_sales_targets

const DEPT_LABELS: Record<string, string> = {
  TR: 'Therapist Foot (Reflexology)',
  TB: 'Therapist Body Massage',
  FO: 'Front Office / Reception',
  KASIR: 'Cashier Desk',
  OB: 'Office Boy / Cleaning',
  SEC: 'Security',
  SPV: 'Supervisor / Head of Shift',
  MGR: 'Branch Manager',
  ADM: 'Administration',
  WH: 'Warehouse / Supply',
  OTHER: 'General Staff',
};

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

export function usePosLiveDashboardData(selectedOutletCode: string = 'ALL') {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(30);

  const initialOpDate = getAutoWIBOperationalDate();
  const [selectedDate, setSelectedDate] = useState<string>(initialOpDate.dateStr);
  const [isOvernightWindow, setIsOvernightWindow] = useState<boolean>(initialOpDate.isOvernight);

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

  const isCustomDate = selectedDate !== getAutoWIBOperationalDate().dateStr;

  const resetToAutoDate = useCallback(() => {
    const autoOp = getAutoWIBOperationalDate();
    setSelectedDate(autoOp.dateStr);
    setIsOvernightWindow(autoOp.isOvernight);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const localDateStr = selectedDate;
      const [y, m, d] = localDateStr.split('-').map(Number);
      const yymmdd = `${String(y).slice(-2)}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;

      const [
        outletsRes,
        masterTransRes,
        detailsRes,
        paymentDetailsRes,
        rejectsRes,
        gcPaymentsRes,
        roomsRes,
        absenRes,
        karyawanRes,
        targetsRes,
      ] = await Promise.all([
        supabase
          .from('master_outlet')
          .select('kode_outlet, name_outlet, alamat, no_telp, city, province, active')
          .eq('active', true)
          .order('kode_outlet', { ascending: true }),

        supabase
          .from('ot_pos_trans_master')
          .select('trans_id, kode_outlet, tanggal, start_time, end_time, status_trans, nama_customer, room_id, subtotal, kodekaryawan, byrequest, typejasa, rcpt, id_payment, user_uid')
          .eq('tanggal', localDateStr)
          .gte('subtotal', 0),

        supabase
          .from('ot_pos_trans_detail')
          .select('trans_id, kode_outlet, tanggal, trans_type_id, produk_jasa_id, produk_jasa_nama, qty, price, subtotal')
          .eq('tanggal', localDateStr),

        supabase
          .from('ot_pos_trans_payment_details')
          .select('id_payment, kode_outlet, tanggal, namapromo, refpromo, vpromo, refdisc, vdisc, total, vredeem, refgift, vgift, vcash, payment1, bank1, refpayment1, vpayment1, payment2, bank2, refpayment2, vpayment2, rcpt, created_at')
          .or(`tanggal.eq.${localDateStr},id_payment.like.%.PAY.${yymmdd}%`),

        supabase
          .from('ot_pos_trans_reject')
          .select('local_autonum, kode_outlet, tanggal, jenis_jasa, reason, reject_date, lasteditdate')
          .eq('tanggal', localDateStr),

        supabase
          .from('ot_pos_trans_payment_details')
          .select('id_payment, kode_outlet, tanggal, namapromo, refpromo, vpromo, refdisc, vdisc, total, vredeem, refgift, vgift, vcash, payment1, bank1, refpayment1, vpayment1, payment2, bank2, refpayment2, vpayment2, rcpt, created_at')
          .gt('vgift', 0)
          .or(`tanggal.eq.${localDateStr},id_payment.like.%.PAY.${yymmdd}%`)
          .order('created_at', { ascending: false }),

        supabase
          .from('ot_master_room')
          .select('uid, kode_outlet, room_id, active, jenis_jasa, room_gender, available, keterangan')
          .eq('active', true),

        supabase
          .from('ot_hrd_absen_harian')
          .select('kode_outlet, kodekaryawan, id_karyawan, nama, tanggal, fp_in, fp_out')
          .eq('tanggal', localDateStr),

        supabase
          .from('ot_hrd_karyawan_info')
          .select('kode_outlet, kodekaryawan, idkaryawan, namakaryawan, departemen, active')
          .eq('active', 'Y'),

        supabase
          .from('master_outlet_sales_targets')
          .select('kode_outlet, year, target_harian')
          .eq('year', y),
      ]);

      if (outletsRes.error) throw new Error(`Outlets Error: ${outletsRes.error.message}`);
      if (masterTransRes.error) throw new Error(`Trans Master Error: ${masterTransRes.error.message}`);
      if (detailsRes.error) throw new Error(`Trans Detail Error: ${detailsRes.error.message}`);
      if (paymentDetailsRes.error) throw new Error(`Payment Details Error: ${paymentDetailsRes.error.message}`);
      if (rejectsRes.error) throw new Error(`Rejections Error: ${rejectsRes.error.message}`);

      const rawOutlets: MasterOutlet[] = (outletsRes.data as MasterOutlet[]) || [];
      const rawMasters: PosTransMaster[] = (masterTransRes.data as PosTransMaster[]) || [];
      const rawDetails: PosTransDetail[] = (detailsRes.data as PosTransDetail[]) || [];
      const rawRejects: PosTransReject[] = (rejectsRes.data as PosTransReject[]) || [];
      const rawRooms: MasterRoom[] = (roomsRes.data as MasterRoom[]) || [];
      const rawAbsen: HrdAbsenHarian[] = (absenRes.data as HrdAbsenHarian[]) || [];
      const rawKaryawan: HrdKaryawanInfo[] = (karyawanRes.data as HrdKaryawanInfo[]) || [];

      // Combine payment records with deduplication
      const paymentMap = new Map<string, PosPaymentDetails>();
      for (const p of ((paymentDetailsRes.data as PosPaymentDetails[]) || [])) {
        paymentMap.set(p.id_payment, p);
      }
      for (const p of ((gcPaymentsRes.data as PosPaymentDetails[]) || [])) {
        if (!paymentMap.has(p.id_payment)) {
          paymentMap.set(p.id_payment, p);
        }
      }

      const masterPayIds = Array.from(
        new Set(rawMasters.map((m) => m.id_payment).filter((id): id is string => typeof id === 'string' && id.length > 0 && !paymentMap.has(id)))
      );

      if (masterPayIds.length > 0) {
        const { data: extraPayments } = await supabase
          .from('ot_pos_trans_payment_details')
          .select('id_payment, kode_outlet, namapromo, refpromo, vpromo, refdisc, vdisc, total, vredeem, refgift, vgift, vcash, payment1, bank1, refpayment1, vpayment1, payment2, bank2, refpayment2, vpayment2, rcpt, created_at')
          .in('id_payment', masterPayIds);
        if (extraPayments && extraPayments.length > 0) {
          for (const p of (extraPayments as PosPaymentDetails[])) {
            paymentMap.set(p.id_payment, p);
          }
        }
      }

      const rawPayments = Array.from(paymentMap.values());

      // HR & Attendance
      const karyawanInfoMap = new Map<string, HrdKaryawanInfo>();
      for (const k of rawKaryawan) {
        if (k.kodekaryawan) {
          karyawanInfoMap.set(k.kodekaryawan.trim().toUpperCase(), k);
        }
      }

      const outletHRData = new Map<
        string,
        { activeTR: number; activeTB: number; totalActive: number; deptMap: Map<string, number> }
      >();

      for (const outlet of rawOutlets) {
        outletHRData.set(outlet.kode_outlet, {
          activeTR: 0,
          activeTB: 0,
          totalActive: 0,
          deptMap: new Map<string, number>(),
        });
      }

      for (const a of rawAbsen) {
        if (!outletHRData.has(a.kode_outlet)) continue;
        if (a.tanggal && a.tanggal !== localDateStr) continue;

        const hasIn = Boolean(a.fp_in);
        const hasOut = Boolean(a.fp_out);
        if (!hasIn && !hasOut) continue;

        if (hasIn && hasOut) {
          const inTime = new Date(a.fp_in!).getTime();
          const outTime = new Date(a.fp_out!).getTime();
          const durationHours = (outTime - inTime) / (1000 * 60 * 60);
          if (durationHours >= 2) continue;
        }

        const oHR = outletHRData.get(a.kode_outlet)!;
        const empCode = (a.kodekaryawan || '').trim().toUpperCase();
        const empInfo = karyawanInfoMap.get(empCode);
        const dept = (empInfo?.departemen || 'OTHER').trim().toUpperCase();

        oHR.totalActive++;
        oHR.deptMap.set(dept, (oHR.deptMap.get(dept) || 0) + 1);

        if (dept === 'TR') oHR.activeTR++;
        else if (dept === 'TB') oHR.activeTB++;
      }

      // Master Rooms Map
      const outletRoomsMap = new Map<string, Map<string, MasterRoom>>();
      for (const outlet of rawOutlets) {
        outletRoomsMap.set(outlet.kode_outlet, new Map());
      }
      for (const r of rawRooms) {
        const oRooms = outletRoomsMap.get(r.kode_outlet);
        if (oRooms && r.room_id) {
          oRooms.set(r.room_id.trim().toUpperCase(), r);
        }
      }

      // Initialize Outlet Metrics Map
      const targetMap = new Map<string, number>();
      if (targetsRes && targetsRes.data) {
        for (const t of targetsRes.data) {
          targetMap.set(t.kode_outlet, Number(t.target_harian));
        }
      }

      const outletMap = new Map<string, OutletCardMetrics>();
      for (const outlet of rawOutlets) {
        const outletTarget = targetMap.get(outlet.kode_outlet) || DEFAULT_DAILY_TARGET;
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
          targetSales: outletTarget,
          progressPercent: 0,
          hrMetrics: createEmptyHRMetrics(),
          roomMetrics: createEmptyRoomMetrics(),
          therapistMetrics: createEmptyTherapistMetrics(),
        });
      }

      let globalActiveCheckIns = 0;
      let globalCompletedTransactions = 0;
      let globalTotalSales = 0;
      let globalCashOnHand = 0;
      let globalGCPayment = 0;
      let globalGCPaymentCount = 0;
      let globalTotalDiscounts = 0;
      let globalTotalPromos = 0;
      let globalTotalRejections = 0;

      const masterTypeMap = new Map<string, string>();
      const activeRoomsUsedMap = new Map<string, Set<string>>();
      const activeTherapistsWorkingMap = new Map<string, { rf: Set<string>; bm: Set<string> }>();

      for (const outlet of rawOutlets) {
        activeRoomsUsedMap.set(outlet.kode_outlet, new Set());
        activeTherapistsWorkingMap.set(outlet.kode_outlet, { rf: new Set(), bm: new Set() });
      }

      // Process Trans Master
      for (const m of rawMasters) {
        if (!outletMap.has(m.kode_outlet)) continue;
        if (m.tanggal && m.tanggal !== localDateStr) continue;

        const subtotal = Number(m.subtotal) || 0;
        if (subtotal < 0) continue;

        const rawTypeJasa = (m.typejasa || '').trim().toUpperCase();
        if (rawTypeJasa) {
          masterTypeMap.set(m.trans_id, rawTypeJasa);
        }

        const isTargetOutlet = selectedOutletCode === 'ALL' || m.kode_outlet === selectedOutletCode;
        const statusUpper = (m.status_trans || '').trim().toUpperCase();
        const isStarted = statusUpper === 'STARTED' && subtotal > 0;
        const isCompleted = statusUpper === 'PAID' || statusUpper === 'CHECKOUT' || statusUpper === 'FINISHED';

        if (isTargetOutlet) {
          if (isStarted) globalActiveCheckIns++;
          if (isCompleted && subtotal > 0) globalCompletedTransactions++;
        }

        const outletMetrics = outletMap.get(m.kode_outlet);
        if (outletMetrics) {
          if (isStarted) outletMetrics.activeGuests++;
          if (isCompleted && subtotal > 0) outletMetrics.completedGuests++;
        }

        if (isStarted) {
          if (m.room_id && m.room_id.trim() !== '') {
            const cleanRoomId = m.room_id.trim().toUpperCase();
            activeRoomsUsedMap.get(m.kode_outlet)?.add(cleanRoomId);
          }
          if (m.kodekaryawan && m.kodekaryawan.trim() !== '') {
            const cleanKaryawan = m.kodekaryawan.trim().toUpperCase();
            const isRF = rawTypeJasa.startsWith('RF') || rawTypeJasa.includes('REFLEX');
            const thMap = activeTherapistsWorkingMap.get(m.kode_outlet);
            if (isRF) {
              thMap?.rf.add(cleanKaryawan);
            } else {
              thMap?.bm.add(cleanKaryawan);
            }
          }
        }
      }

      // Process Details
      const globalCategoryMix = createEmptyCategoryMix();
      const globalItemCounts = new Map<string, number>();
      const outletItemMaps = new Map<string, Map<string, number>>();

      for (const d of rawDetails) {
        if (!outletMap.has(d.kode_outlet)) continue;
        if (d.tanggal && d.tanggal !== localDateStr) continue;

        const qty = Number(d.qty) || 0;
        if (qty <= 0) continue;

        const isTargetOutlet = selectedOutletCode === 'ALL' || d.kode_outlet === selectedOutletCode;
        const tType = (d.trans_type_id || '').trim().toUpperCase();
        const itemName = (d.produk_jasa_nama || '').trim();

        let resolvedCategory: 'BJ' | 'BA' | 'BP' | 'BG' = 'BJ';
        if (tType === 'BA') resolvedCategory = 'BA';
        else if (tType === 'BP') resolvedCategory = 'BP';
        else if (tType === 'BG') resolvedCategory = 'BG';
        else if (tType === 'BJ') resolvedCategory = 'BJ';
        else {
          const masterType = masterTypeMap.get(d.trans_id);
          if (masterType && (masterType.startsWith('RF') || masterType.startsWith('BM'))) {
            resolvedCategory = 'BJ';
          }
        }

        if (isTargetOutlet) {
          if (resolvedCategory === 'BJ') globalCategoryMix.footAndBody += qty;
          else if (resolvedCategory === 'BA') globalCategoryMix.additional += qty;
          else if (resolvedCategory === 'BP') globalCategoryMix.product += qty;
          else if (resolvedCategory === 'BG') globalCategoryMix.gcSales += qty;
          globalCategoryMix.total += qty;

          if (itemName && itemName.toUpperCase() !== 'NULL' && itemName !== '') {
            globalItemCounts.set(itemName, (globalItemCounts.get(itemName) || 0) + qty);
          }
        }

        const outletMetrics = outletMap.get(d.kode_outlet);
        if (outletMetrics) {
          if (resolvedCategory === 'BJ') outletMetrics.categoryMix.footAndBody += qty;
          else if (resolvedCategory === 'BA') outletMetrics.categoryMix.additional += qty;
          else if (resolvedCategory === 'BP') outletMetrics.categoryMix.product += qty;
          else if (resolvedCategory === 'BG') outletMetrics.categoryMix.gcSales += qty;
          outletMetrics.categoryMix.total += qty;

          if (itemName && itemName.toUpperCase() !== 'NULL' && itemName !== '') {
            if (!outletItemMaps.has(d.kode_outlet)) {
              outletItemMaps.set(d.kode_outlet, new Map());
            }
            const oItemMap = outletItemMaps.get(d.kode_outlet)!;
            oItemMap.set(itemName, (oItemMap.get(itemName) || 0) + qty);
          }
        }
      }

      // Process Payments
      const methodMap = new Map<string, { total: number; count: number }>();
      const promoMap = new Map<string, { totalDiscount: number; usageCount: number }>();

      const addPaymentTender = (methodName: string, amount: number) => {
        if (!methodName || amount <= 0) return;
        const normName = methodName.trim().toUpperCase();
        const cur = methodMap.get(normName) || { total: 0, count: 0 };
        cur.total += amount;
        cur.count++;
        methodMap.set(normName, cur);
      };

      for (const p of rawPayments) {
        if (!outletMap.has(p.kode_outlet)) continue;
        if (p.tanggal && p.tanggal !== localDateStr) continue;

        const totalPay = Number(p.total) || 0;
        const cash = Number(p.vcash) || 0;
        const vgift = Number(p.vgift) || 0;
        const vpay1 = Number(p.vpayment1) || 0;
        const vpay2 = Number(p.vpayment2) || 0;
        const vdisc = Number(p.vdisc) || 0;
        const vpromo = Number(p.vpromo) || 0;

        const isTargetOutlet = selectedOutletCode === 'ALL' || p.kode_outlet === selectedOutletCode;

        if (isTargetOutlet) {
          globalTotalSales += totalPay;
          globalCashOnHand += cash;
          if (vgift > 0) {
            globalGCPayment += vgift;
            globalGCPaymentCount++;
          }
          globalTotalDiscounts += vdisc;
          globalTotalPromos += vpromo;

          if (cash > 0) addPaymentTender('CASH', cash);
          if (vgift > 0) addPaymentTender('VOUCHER (GIFT)', vgift);

          if (vpay1 > 0) {
            const m1 = p.bank1 && p.bank1.trim() !== '' ? `${p.payment1 || 'EDC'} - ${p.bank1}` : (p.payment1 || 'EDC');
            addPaymentTender(m1, vpay1);
          }
          if (vpay2 > 0) {
            const m2 = p.bank2 && p.bank2.trim() !== '' ? `${p.payment2 || 'SPLIT'} - ${p.bank2}` : (p.payment2 || 'SPLIT');
            addPaymentTender(m2, vpay2);
          }

          const promoLabel = p.namapromo?.trim() || p.refpromo?.trim();
          if (promoLabel && (vpromo > 0 || vdisc > 0)) {
            const promoNorm = promoLabel.toUpperCase();
            const curPromo = promoMap.get(promoNorm) || { totalDiscount: 0, usageCount: 0 };
            curPromo.totalDiscount += (vpromo + vdisc);
            curPromo.usageCount++;
            promoMap.set(promoNorm, curPromo);
          }
        }

        const outletMetrics = outletMap.get(p.kode_outlet);
        if (outletMetrics) {
          outletMetrics.totalSales += totalPay;
          outletMetrics.cashOnHand += cash;
          if (vgift > 0) {
            outletMetrics.gcPayment += vgift;
            outletMetrics.gcPaymentCount++;
          }
        }
      }

      // Process Rejections
      const reasonMap = new Map<string, { count: number; services: Set<string> }>();

      for (const r of rawRejects) {
        if (!outletMap.has(r.kode_outlet)) continue;
        if (r.tanggal && r.tanggal !== localDateStr) continue;

        const isTargetOutlet = selectedOutletCode === 'ALL' || r.kode_outlet === selectedOutletCode;
        const reason = (r.reason || 'Lainnya / Tidak Disebutkan').trim();

        if (isTargetOutlet) {
          globalTotalRejections++;
          const cur = reasonMap.get(reason) || { count: 0, services: new Set() };
          cur.count++;
          if (r.jenis_jasa) cur.services.add(r.jenis_jasa);
          reasonMap.set(reason, cur);
        }

        const outletMetrics = outletMap.get(r.kode_outlet);
        if (outletMetrics) {
          outletMetrics.rejectionCount++;
        }
      }

      // Finalize Room & Therapist Capacity
      let globalTotalRooms = 0;
      let globalUsedRooms = 0;
      let globalUsedBM = 0;
      let globalUsedRF = 0;
      let globalRoomsBM = 0;
      let globalRoomsRF = 0;

      let globalActiveTR = 0;
      let globalActiveTB = 0;
      let globalTotalActiveStaff = 0;
      const globalDeptMap = new Map<string, number>();

      let globalOnTreatmentRF = 0;
      let globalOnTreatmentBM = 0;

      for (const outlet of rawOutlets) {
        const outletMetrics = outletMap.get(outlet.kode_outlet)!;

        const hrInfo = outletHRData.get(outlet.kode_outlet) || {
          activeTR: 0,
          activeTB: 0,
          totalActive: 0,
          deptMap: new Map(),
        };

        const deptArray: { departemen: string; label: string; count: number }[] = [];
        for (const [dCode, count] of hrInfo.deptMap.entries()) {
          deptArray.push({
            departemen: dCode,
            label: DEPT_LABELS[dCode] || dCode,
            count,
          });
        }
        deptArray.sort((a, b) => b.count - a.count);

        outletMetrics.hrMetrics = {
          totalActiveStaff: hrInfo.totalActive,
          activeTR: hrInfo.activeTR,
          activeTB: hrInfo.activeTB,
          departments: deptArray,
        };

        // Room Calculation
        const allRoomsForOutlet = outletRoomsMap.get(outlet.kode_outlet) || new Map();
        let totalRoomsCount = 0;
        let bmRoomsCount = 0;
        let rfRoomsCount = 0;

        for (const room of allRoomsForOutlet.values()) {
          totalRoomsCount++;
          const jJasa = (room.jenis_jasa || '').trim().toUpperCase();
          if (jJasa.startsWith('RF') || jJasa.includes('REFLEX')) {
            rfRoomsCount++;
          } else {
            bmRoomsCount++;
          }
        }

        const usedRoomsSet = activeRoomsUsedMap.get(outlet.kode_outlet) || new Set();
        let usedBM = 0;
        let usedRF = 0;

        for (const usedRoomId of usedRoomsSet) {
          const rObj = allRoomsForOutlet.get(usedRoomId);
          const jJasa = (rObj?.jenis_jasa || '').trim().toUpperCase();
          if (jJasa.startsWith('RF') || jJasa.includes('REFLEX')) {
            usedRF++;
          } else {
            usedBM++;
          }
        }

        const usedRoomsTotal = usedRoomsSet.size;
        const availableRoomsTotal = Math.max(0, totalRoomsCount - usedRoomsTotal);
        const availableBM = Math.max(0, bmRoomsCount - usedBM);
        const availableRF = Math.max(0, rfRoomsCount - usedRF);
        const occupancyPercent = totalRoomsCount > 0 ? Math.round((usedRoomsTotal / totalRoomsCount) * 100) : 0;
        const cumulativeTurnover = totalRoomsCount > 0 ? Number((outletMetrics.completedGuests / totalRoomsCount).toFixed(1)) : 0;

        outletMetrics.roomMetrics = {
          totalRooms: totalRoomsCount,
          roomsBM: bmRoomsCount,
          roomsRF: rfRoomsCount,
          usedRooms: usedRoomsTotal,
          usedBM,
          usedRF,
          availableRooms: availableRoomsTotal,
          availableBM,
          availableRF,
          occupancyPercent,
          cumulativeTurnover,
        };

        // Therapist Calculation
        const thWorking = activeTherapistsWorkingMap.get(outlet.kode_outlet) || { rf: new Set(), bm: new Set() };
        const onTreatmentRF = thWorking.rf.size;
        const onTreatmentBM = thWorking.bm.size;
        const totalOnTreatment = onTreatmentRF + onTreatmentBM;

        const inChargeTR = hrInfo.activeTR;
        const inChargeTB = hrInfo.activeTB;
        const totalInCharge = inChargeTR + inChargeTB;

        const availableTR = Math.max(0, inChargeTR - onTreatmentRF);
        const availableTB = Math.max(0, inChargeTB - onTreatmentBM);
        const totalAvailable = availableTR + availableTB;

        const utilizationPercent = totalInCharge > 0 ? Math.round((totalOnTreatment / totalInCharge) * 100) : 0;
        const cumulativeProductivity = totalInCharge > 0 ? Number((outletMetrics.completedGuests / totalInCharge).toFixed(1)) : 0;

        outletMetrics.therapistMetrics = {
          inChargeTR,
          inChargeTB,
          totalInCharge,
          onTreatmentRF,
          onTreatmentBM,
          totalOnTreatment,
          availableTR,
          availableTB,
          totalAvailable,
          utilizationPercent,
          cumulativeProductivity,
        };

        // Global Aggregation
        const isTarget = selectedOutletCode === 'ALL' || outlet.kode_outlet === selectedOutletCode;
        if (isTarget) {
          globalTotalRooms += totalRoomsCount;
          globalRoomsBM += bmRoomsCount;
          globalRoomsRF += rfRoomsCount;
          globalUsedRooms += usedRoomsTotal;
          globalUsedBM += usedBM;
          globalUsedRF += usedRF;

          globalActiveTR += inChargeTR;
          globalActiveTB += inChargeTB;
          globalTotalActiveStaff += hrInfo.totalActive;
          globalOnTreatmentRF += onTreatmentRF;
          globalOnTreatmentBM += onTreatmentBM;

          for (const [dCode, cnt] of hrInfo.deptMap.entries()) {
            globalDeptMap.set(dCode, (globalDeptMap.get(dCode) || 0) + cnt);
          }
        }

        // Top items for outlet
        const oItems = outletItemMaps.get(outlet.kode_outlet);
        if (oItems) {
          outletMetrics.topItems = Array.from(oItems.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        }

        const target = outletMetrics.targetSales || DEFAULT_DAILY_TARGET;
        outletMetrics.progressPercent = target > 0 ? Math.min(100, Math.round((outletMetrics.totalSales / target) * 100)) : 0;
      }

      let globalTargetSales = 0;
      for (const outlet of rawOutlets) {
        const outletMetrics = outletMap.get(outlet.kode_outlet);
        if (outletMetrics) {
          const target = outletMetrics.targetSales || DEFAULT_DAILY_TARGET;
          globalTargetSales += target;
        }
      }
      const globalProgressPercent = globalTargetSales > 0 ? Math.min(100, Math.round((globalTotalSales / globalTargetSales) * 100)) : 0;

      // Finalize Global Garden Summary
      const globalGlobalDeptArray: { departemen: string; label: string; count: number }[] = [];
      for (const [dCode, count] of globalDeptMap.entries()) {
        globalGlobalDeptArray.push({
          departemen: dCode,
          label: DEPT_LABELS[dCode] || dCode,
          count,
        });
      }
      globalGlobalDeptArray.sort((a, b) => b.count - a.count);

      const globalAvailableRooms = Math.max(0, globalTotalRooms - globalUsedRooms);
      const globalAvailableBM = Math.max(0, globalRoomsBM - globalUsedBM);
      const globalAvailableRF = Math.max(0, globalRoomsRF - globalUsedRF);
      const globalOccupancy = globalTotalRooms > 0 ? Math.round((globalUsedRooms / globalTotalRooms) * 100) : 0;
      const globalTurnover = globalTotalRooms > 0 ? Number((globalCompletedTransactions / globalTotalRooms).toFixed(1)) : 0;

      const globalTotalInCharge = globalActiveTR + globalActiveTB;
      const globalTotalOnTreatment = globalOnTreatmentRF + globalOnTreatmentBM;
      const globalAvailableTR = Math.max(0, globalActiveTR - globalOnTreatmentRF);
      const globalAvailableTB = Math.max(0, globalActiveTB - globalOnTreatmentBM);
      const globalTotalAvailableTherapists = globalAvailableTR + globalAvailableTB;
      const globalUtilization = globalTotalInCharge > 0 ? Math.round((globalTotalOnTreatment / globalTotalInCharge) * 100) : 0;
      const globalProductivity = globalTotalInCharge > 0 ? Number((globalCompletedTransactions / globalTotalInCharge).toFixed(1)) : 0;

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
        activeCheckIns: globalActiveCheckIns,
        completedTransactions: globalCompletedTransactions,
        totalDiscounts: globalTotalDiscounts,
        totalPromos: globalTotalPromos,
        totalRejections: globalTotalRejections,
        categoryMix: globalCategoryMix,
        topItems: globalTopItems,
        hrMetrics: {
          totalActiveStaff: globalTotalActiveStaff,
          activeTR: globalActiveTR,
          activeTB: globalActiveTB,
          departments: globalGlobalDeptArray,
        },
        roomMetrics: {
          totalRooms: globalTotalRooms,
          roomsBM: globalRoomsBM,
          roomsRF: globalRoomsRF,
          usedRooms: globalUsedRooms,
          usedBM: globalUsedBM,
          usedRF: globalUsedRF,
          availableRooms: globalAvailableRooms,
          availableBM: globalAvailableBM,
          availableRF: globalAvailableRF,
          occupancyPercent: globalOccupancy,
          cumulativeTurnover: globalTurnover,
        },
        therapistMetrics: {
          inChargeTR: globalActiveTR,
          inChargeTB: globalActiveTB,
          totalInCharge: globalTotalInCharge,
          onTreatmentRF: globalOnTreatmentRF,
          onTreatmentBM: globalOnTreatmentBM,
          totalOnTreatment: globalTotalOnTreatment,
          availableTR: globalAvailableTR,
          availableTB: globalAvailableTB,
          totalAvailable: globalTotalAvailableTherapists,
          utilizationPercent: globalUtilization,
          cumulativeProductivity: globalProductivity,
        },
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
      console.error('POS Live Dashboard Data Fetch Error:', err);
      setError(err.message || 'Gagal memuat data POS Live Dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedOutletCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 30s Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchData]);

  return {
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
    refresh: fetchData,
    selectedDate,
    setSelectedDate,
    isOvernightWindow,
    resetToAutoDate,
    isCustomDate,
  };
}
