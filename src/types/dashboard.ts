export interface FinancialMetric {
    id_payment: string
    tanggal: string // ISO date string
    net_revenue: number
    kode_outlet: string

    // Direct Components
    amount_cash: number
    amount_gift: number
    amount_discount: number

    // Split Payment Slot 1
    method_1: string | null
    bank_1: string | null
    amount_1: number

    // Split Payment Slot 2
    method_2: string | null
    bank_2: string | null
    amount_2: number
}

// Keep DailyRevenue as is
export interface DailyRevenue {
    date: string
    revenue: number
}

// Stats for Charts
export interface PaymentMethodStats {
    name: string
    value: number
    color: string
    [key: string]: any
}

export interface BankStats {
    bankName: string
    amount: number
}

export interface DashboardFilter {
    startDate: Date | undefined
    endDate: Date | undefined
    outletId: string | 'ALL'
}

export interface DashboardState {
    totalRevenue: number
    totalDiscounts: number
    totalCash: number
    // We can keep cashFlow if we want to show composite Cash vs Non-Cash, 
    // or just remove it if not needed. 
    // Requirement says: Revenue, Discounts, Cash Received.
    // Let's keep it simple.
}

// --- Operational Dashboard Types ---

export interface OperationalMetric {
    trans_id: string
    tanggal: string // ISO date string
    gender: 'F' | 'M'
    therapist_id: string
    therapist_name?: string // Optional, might need to join/map
    room_id: string
    duration_minutes: number
    is_by_request: 'Y' | 'N'
    service_category: string // e.g. 'RF', 'BM'
    kode_outlet: string
}

export interface TherapistPerformance {
    therapistId: string
    therapistName: string
    totalDuration: number
    requestCount: number
    transactionCount: number
    serviceDistribution: Record<string, number> // category -> percentage (0-100) or count
}

export interface RoomPerformance {
    roomId: string
    transactionCount: number
    serviceDistribution: Record<string, number>
}

export interface OperationalDashboardState {
    totalHours: number
    totalGuests: number
    genderDistribution: { name: string; value: number; color: string }[]
    serviceCategoryData?: { name: string; value: number }[]
    therapistStats: TherapistPerformance[]
    roomStats: RoomPerformance[]
}
