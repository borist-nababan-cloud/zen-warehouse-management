import { Button } from '@/components/ui/button'
import { Construction, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function UnderConstructionPage() {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
            <div className="mb-8 rounded-full bg-pastel-blue/20 p-8">
                <Construction className="h-24 w-24 text-primary opacity-80" />
            </div>

            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Under Construction
            </h1>

            <p className="mb-8 max-w-md text-lg text-muted-foreground">
                We're currently working hard to bring you this feature.
                Please check back soon for updates!
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
