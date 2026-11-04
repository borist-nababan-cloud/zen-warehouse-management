export interface MasterOutlet {
  kode_outlet: string;
  name_outlet: string;
  alamat?: string;
  no_telp?: string;
  city?: string;
  province?: string;
  active: boolean;
}

export interface PosTransMaster {
  trans_id: string;
  kode_outlet: string;
  tanggal: string;
  start_time: string;
  end_time?: string;
  status_trans: string;
  nama_customer?: string;
  room_id?: string;
  subtotal: number;
  kodekaryawan?: string;
  byrequest?: string;
  typejasa?: string;
  rcpt?: string;
  id_payment?: string;
  user_uid?: string;
}

export interface PosPaymentDetails {
  id_payment: string;
  kode_outlet: string;
  tanggal?: string;
  namapromo?: string;
  refpromo?: string;
  vpromo: number;
  refdisc?: string;
  vdisc: number;
  total: number;
  vredeem: number;
  refgift?: string;
  vgift: number;
  vcash: number;
  payment1?: string;
  bank1?: string;
  refpayment1?: string;
  vpayment1: number;
  payment2?: string;
  bank2?: string;
  refpayment2?: string;
  vpayment2: number;
  rcpt?: string;
  created_at?: string;
}

export interface PosTransReject {
  local_autonum?: number;
  kode_outlet: string;
  tanggal?: string;
  jenis_jasa?: string;
  reason?: string;
  reject_date: string;
  lasteditdate?: string;
}

export interface PosTransDetail {
  id?: string;
  trans_id: string;
  kode_outlet: string;
  tanggal: string;
  trans_type_id?: string;
  produk_jasa_id?: string;
  produk_jasa_nama?: string;
  qty: number;
  price?: number;
  subtotal?: number;
}

export interface CategoryMix {
  footAndBody: number; // BJ: Foot & Body
  additional: number;  // BA: Additional
  product: number;     // BP: Product
  gcSales: number;     // BG: GC Sales
  total: number;
}

export interface MasterRoom {
  uid?: string;
  kode_outlet: string;
  room_id: string;
  active: boolean;
  jenis_jasa?: string;
  room_gender?: string;
  available?: boolean;
  keterangan?: string;
  fasilitas?: string;
}

export interface HrdAbsenHarian {
  id?: string;
  local_autonum?: number;
  kode_outlet: string;
  kodekaryawan: string;
  id_karyawan?: string;
  nama?: string;
  tanggal: string;
  waktu?: string;
  status?: string;
  notes?: string;
  fp_in?: string;
  fp_out?: string;
}

export interface HrdKaryawanInfo {
  id?: string;
  kode_outlet?: string;
  kodekaryawan: string;
  idkaryawan?: string;
  namakaryawan?: string;
  departemen?: string;
  active?: string;
}

export interface DepartmentStaffCount {
  departemen: string;
  label: string;
  count: number;
}

export interface OutletHRMetrics {
  totalActiveStaff: number;
  activeTR: number; // Therapist Reflexology (Foot)
  activeTB: number; // Therapist Body
  departments: DepartmentStaffCount[];
}

export interface OutletRoomMetrics {
  totalRooms: number;
  roomsBM: number;
  roomsRF: number;
  usedRooms: number;
  usedBM: number;
  usedRF: number;
  availableRooms: number;
  availableBM: number;
  availableRF: number;
  occupancyPercent: number;
  cumulativeTurnover: number;
}

export interface OutletTherapistMetrics {
  inChargeTR: number;
  inChargeTB: number;
  totalInCharge: number;
  onTreatmentRF: number;
  onTreatmentBM: number;
  totalOnTreatment: number;
  availableTR: number;
  availableTB: number;
  totalAvailable: number;
  utilizationPercent: number;
  cumulativeProductivity: number;
}

export interface ItemRankItem {
  name: string;
  count: number;
  category?: string;
}

export interface OutletCardMetrics {
  outlet: MasterOutlet;
  totalSales: number;
  cashOnHand: number;
  gcPayment: number;
  gcPaymentCount: number;
  activeGuests: number;
  completedGuests: number;
  rejectionCount: number;
  categoryMix: CategoryMix;
  topItems: ItemRankItem[];
  targetSales?: number;
  progressPercent: number;
  hrMetrics?: OutletHRMetrics;
  roomMetrics?: OutletRoomMetrics;
  therapistMetrics?: OutletTherapistMetrics;
}

export interface PaymentMethodItem {
  method: string;
  total: number;
  count: number;
}

export interface PromoImpactItem {
  promoName: string;
  totalDiscount: number;
  usageCount: number;
}

export interface RejectionReasonItem {
  reason: string;
  count: number;
  serviceTypes: string[];
}

export interface GlobalGardenSummary {
  totalSales: number;
  totalTargetSales?: number;
  targetProgressPercent?: number;
  cashOnHand: number;
  gcPayment: number;
  gcPaymentCount: number;
  activeCheckIns: number;
  completedTransactions: number;
  totalDiscounts: number;
  totalPromos: number;
  totalRejections: number;
  categoryMix: CategoryMix;
  topItems: ItemRankItem[];
  hrMetrics?: OutletHRMetrics;
  roomMetrics?: OutletRoomMetrics;
  therapistMetrics?: OutletTherapistMetrics;
}

export interface DashboardDataState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  summary: GlobalGardenSummary;
  outlets: OutletCardMetrics[];
  paymentBreakdown: PaymentMethodItem[];
  promoImpact: PromoImpactItem[];
  rejectionReasons: RejectionReasonItem[];
  allActiveOutlets: MasterOutlet[];
}

export interface MasterOutletSalesTarget {
  id?: string;
  kode_outlet: string;
  year: number;
  target_tahunan: number;
  target_bulanan: number;
  target_harian: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

