import { useQuery } from '@tanstack/react-query'
import { getInventoryReport, getShrinkageReport, getOpnameVarianceReport } from '@/services/inventoryService'

export function useInventoryReport(kode_outlet?: string) {
    return useQuery({
        queryKey: ['inventory', 'report', kode_outlet],
        queryFn: () => getInventoryReport(kode_outlet),
    })
}

export function useShrinkageReport(kode_outlet?: string, startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['inventory', 'report', 'shrinkage', kode_outlet, startDate, endDate],
        queryFn: () => getShrinkageReport(kode_outlet!, startDate, endDate),
        enabled: !!kode_outlet,
    })
}

export function useOpnameVarianceReport(kode_outlet?: string, startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['inventory', 'report', 'opname-variance', kode_outlet, startDate, endDate],
        queryFn: () => getOpnameVarianceReport(kode_outlet, startDate, endDate),
    })
}
