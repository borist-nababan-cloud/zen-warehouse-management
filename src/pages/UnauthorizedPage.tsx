import { Button } from '@/components/ui/button'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function UnauthorizedPage() {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
            <div className="mb-8 rounded-full bg-red-100 p-8">
                <ShieldAlert className="h-24 w-24 text-red-500 opacity-80" />
            </div>

            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Access Denied
            </h1>

            <p className="mb-8 max-w-md text-lg text-muted-foreground">
                You do not have permission to view this page.
                Please contact your administrator if you believe this is an error.
            </p>

            <Button
                onClick={() => navigate('/dashboard')}
                className="gap-2 bg-primary hover:bg-primary/90"
                size="lg"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Button>
        </div>
    )
}
