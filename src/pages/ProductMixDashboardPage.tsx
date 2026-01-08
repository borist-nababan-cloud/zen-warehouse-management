import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ProductMixLiveSection } from '@/components/features/product-mix/ProductMixLiveSection'
import { ProductMixHistoricalSection } from '@/components/features/product-mix/ProductMixHistoricalSection'

import { AIChatWidget } from '@/components/features/ai/AIChatWidget'

export function ProductMixDashboardPage() {
    const { user } = useAuthUser()
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])

    // Fetch Outlets (for roles that can see multiple outlets)
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
            <div className="space-y-8 animate-in fade-in duration-500 relative">
                {/* Header Section */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Product & Service Mix
                    </h1>
                    <p className="text-muted-foreground">
                        Analyze what we are selling and how effective our promos are.
                    </p>
                </div>

                {/* Section 1: Live Monitor (Today) */}
                <ProductMixLiveSection
                    userRole={user?.user_role}
                    userOutlet={user?.kode_outlet || undefined}
                    availableOutlets={availableOutlets}
                />

                {/* Section 2: Historical Analysis */}
                <div className="pt-4 border-t">
                    <ProductMixHistoricalSection
                        userRole={user?.user_role}
                        userOutlet={user?.kode_outlet || undefined}
                        availableOutlets={availableOutlets}
                    />
                </div>

                {/* AI Chat Widget */}
                <AIChatWidget
                    pageName="Product & Service Mix Dashboard"
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
