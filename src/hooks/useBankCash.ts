
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFinancialAccounts, createFinancialAccount, createGeneralTransaction, getTransactionCategories } from '@/services/financeService'

export function useFinancialAccounts(outletCode: string | undefined | null) {
  return useQuery({
    queryKey: ['financial-accounts', outletCode],
    queryFn: () => getFinancialAccounts(outletCode!),
    enabled: !!outletCode
  })
}

export function useCreateFinancialAccount() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createFinancialAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
        }
    })
}

export function useTransactionCategories(type: 'IN' | 'OUT') {
    return useQuery({
        queryKey: ['transaction-categories', type],
        queryFn: () => getTransactionCategories(type)
    })
}

export function useCreateGeneralTransaction() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createGeneralTransaction,
        onSuccess: () => {
             // Invalidate relevant queries (e.g., cash flow, accounts)
             queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
             queryClient.invalidateQueries({ queryKey: ['finance', 'report', 'cash-flow'] })
        }
    })
}
