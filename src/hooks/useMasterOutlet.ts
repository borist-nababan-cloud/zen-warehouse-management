
import { useQuery } from '@tanstack/react-query'
import { masterOutletService } from '@/services/masterOutletService'

export function useMasterOutlet(filterCanSto: boolean = false) {
  return useQuery({
    queryKey: ['master_outlet', { filterCanSto }],
    queryFn: () => masterOutletService.getAllOutlets(filterCanSto),
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useOutletDetail(code: string) {
  return useQuery({
    queryKey: ['master_outlet', code],
    queryFn: () => masterOutletService.getOutletByCode(code),
    enabled: !!code
  })
}
