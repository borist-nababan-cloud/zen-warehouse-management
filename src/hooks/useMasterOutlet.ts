import { useQuery } from '@tanstack/react-query'
import { masterOutletService } from '@/services/masterOutletService'

export function useMasterOutlet(filterCanSto: boolean = false) {
  return useQuery({
    queryKey: ['master_outlet', { filterCanSto }],
    queryFn: () =>
      filterCanSto
        ? masterOutletService.getAllWhOutlet()
        : masterOutletService.getAllOutlets(false),
    staleTime: 0,
  })
}

export function useOutletDetail(code: string) {
  return useQuery({
    queryKey: ['master_outlet', code],
    queryFn: () => masterOutletService.getOutletByCode(code),
    enabled: !!code
  })
}
