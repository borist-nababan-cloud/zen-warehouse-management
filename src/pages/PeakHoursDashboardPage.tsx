import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { PeakHoursLiveSection } from '@/components/features/peak-hours/PeakHoursLiveSection'
import { PeakHoursHistoricalSection } from '@/components/features/peak-hours/PeakHoursHistoricalSection'
import { useAuthUser } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

import { AIChatWidget } from '@/components/features/ai/AIChatWidget'

export function PeakHoursDashboardPage() {
    const { user } = useAuthUser()
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])

    // Fetch authorized outlets for filter if user is Admin/Holding
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
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                        Peak Hours Monitor
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Analyze traffic density and optimize staffing schedules.
                    </p>
                </div>

                {/* Live Section (Today's Traffic) */}
                <PeakHoursLiveSection
                    userRole={user?.user_role}
                    userOutlet={user?.kode_outlet || undefined}
                    availableOutlets={availableOutlets}
                />

                <div className="border-t border-slate-200 dark:border-slate-700 my-6" />

                {/* Historical Section (Deep Analysis) */}
                <PeakHoursHistoricalSection
                    userRole={user?.user_role}
                    userOutlet={user?.kode_outlet || undefined}
                    availableOutlets={availableOutlets}
                />

                {/* AI Chat Widget */}
                <AIChatWidget
                    pageName="Peak Hours Analysis"
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
