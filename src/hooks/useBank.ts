import { useQuery } from '@tanstack/react-query'
import { getAllBanks } from '@/services/bankService'

export const bankQueryKeys = {
  all: ['master_bank'] as const,
  lists: () => [...bankQueryKeys.all, 'list'] as const,
}

/**
 * Hook to get all banks
 * Used for dropdowns
 */
export function useAllBanks() {
  return useQuery({
    queryKey: bankQueryKeys.lists(),
    queryFn: () => getAllBanks(),
    staleTime: 1000 * 60 * 60, // 1 hour (banks rarely change)
  })
}
