import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LiveSection } from '@/components/features/financial/LiveSection'
import { HistoricalSection } from '@/components/features/financial/HistoricalSection'

import { AIChatWidget } from '@/components/features/ai/AIChatWidget'

export function FinancialDashboardPage() {
    const { user } = useAuthUser()

    // Available Outlets Shared State
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])

    // Fetch Outlets
    useEffect(() => {
        async function fetchOutlets() {
            if (user?.user_role === 1 || user?.user_role === 5 || user?.user_role === 8) {
                const { data } = await supabase
                    .from('master_outlet')
                    .select('kode_outlet, name_outlet')
                    .eq('active', true)
                    .order('name_outlet', { ascending: true })

                if (data) setAvailableOutlets(data)
            }
        }
        fetchOutlets()
    }, [user])

    return (
        <DashboardLayout>
            <div className="space-y-8 relative">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Financial Performance</h1>
                </div>

                {/* Section 1: Live Monitor */}
                <LiveSection
                    userRole={user?.user_role}
                    userOutlet={user?.kode_outlet || undefined}
                    availableOutlets={availableOutlets}
                />

                {/* Section 2: Historical Analysis */}
                <HistoricalSection
                    userRole={user?.user_role}
                    userOutlet={user?.kode_outlet || undefined}
                    availableOutlets={availableOutlets}
                />

                {/* AI Chat Widget */}
                <AIChatWidget
                    pageName="Financial Dashboard"
                    contextData={{
                        userRole: user?.user_role,
                        userOutlet: user?.kode_outlet,
                        availableOutlets: availableOutlets
                    }}
                />
            </div>
        </DashboardLayout>
    )
}
