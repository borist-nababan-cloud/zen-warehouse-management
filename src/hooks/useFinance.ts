import { useQuery } from '@tanstack/react-query'
import { getApAgingReport, getCashFlowReport } from '@/services/financeService'

export function useApAgingReport(outletCode: string | undefined) {
    return useQuery({
        queryKey: ['finance', 'report', 'ap-aging', outletCode],
        queryFn: () => getApAgingReport(outletCode!),
        enabled: !!outletCode,
    })
}

export function useCashFlowReport(outletCode: string | undefined, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['finance', 'report', 'cash-flow', outletCode, startDate, endDate],
        queryFn: () => getCashFlowReport(outletCode!, startDate, endDate),
        enabled: !!outletCode && !!startDate && !!endDate,
    })
}
