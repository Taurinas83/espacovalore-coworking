import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
    title: string
    subtitle?: string
    backUrl?: string
    children?: React.ReactNode // For extra actions like "Add Post" button
}

export function PageHeader({ title, subtitle, backUrl = '/', children }: PageHeaderProps) {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-start gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 min-w-[40px] rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white backdrop-blur-sm"
                    onClick={() => navigate(backUrl)}
                >
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">{title}</h1>
                    {subtitle && <p className="text-white/90 drop-shadow-sm mt-1">{subtitle}</p>}
                </div>
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
    )
}
