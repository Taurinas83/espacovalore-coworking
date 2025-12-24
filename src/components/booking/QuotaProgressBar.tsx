import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, AlertTriangle } from 'lucide-react'

interface QuotaProgressBarProps {
    userId?: string
    showLabel?: boolean
    compact?: boolean
}

export function QuotaProgressBar({ userId, showLabel = true, compact = false }: QuotaProgressBarProps) {
    const [hoursUsed, setHoursUsed] = useState<number>(0)
    const [quotaLimit, setQuotaLimit] = useState<number>(10)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchQuotaData()
    }, [userId])

    const fetchQuotaData = async () => {
        try {
            let targetUserId = userId

            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                targetUserId = user.id
            }

            // Get user quota limit from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('monthly_hours_quota')
                .eq('id', targetUserId)
                .single()

            if (profile?.monthly_hours_quota) {
                setQuotaLimit(profile.monthly_hours_quota)
            }

            // Get hours used this month using RPC function
            const { data: hoursData, error } = await supabase
                .rpc('get_user_monthly_hours', { user_uuid: targetUserId })

            if (!error && hoursData !== null) {
                setHoursUsed(parseFloat(hoursData) || 0)
            } else {
                // Fallback: calculate client-side if function doesn't exist yet
                const now = new Date()
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

                const { data: bookings } = await supabase
                    .from('bookings')
                    .select('start_time, end_time')
                    .eq('user_id', targetUserId)
                    .gte('start_time', monthStart.toISOString())
                    .lt('start_time', monthEnd.toISOString())

                if (bookings) {
                    const totalHours = bookings.reduce((acc, booking) => {
                        const start = new Date(booking.start_time)
                        const end = new Date(booking.end_time)
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                        return acc + hours
                    }, 0)
                    setHoursUsed(Math.round(totalHours * 100) / 100)
                }
            }
        } catch (error) {
            console.error('Error fetching quota data:', error)
        } finally {
            setLoading(false)
        }
    }

    const percentage = Math.min((hoursUsed / quotaLimit) * 100, 100)
    const remainingHours = Math.max(quotaLimit - hoursUsed, 0)

    // Color based on usage
    const getProgressColor = () => {
        if (percentage >= 90) return 'bg-red-500'
        if (percentage >= 70) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getTextColor = () => {
        if (percentage >= 90) return 'text-red-600'
        if (percentage >= 70) return 'text-yellow-600'
        return 'text-green-600'
    }

    if (loading) {
        return (
            <div className={`${compact ? 'h-2' : 'h-4'} bg-gray-200 rounded-full animate-pulse`} />
        )
    }

    if (compact) {
        return (
            <div className="w-full">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getProgressColor()} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className={`text-xs ${getTextColor()} mt-1`}>
                    {hoursUsed.toFixed(1)}h / {quotaLimit}h
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white/90 backdrop-blur rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${getTextColor()}`} />
                    {showLabel && (
                        <span className="font-medium text-gray-700">Cota Mensal</span>
                    )}
                </div>
                <span className={`text-sm font-bold ${getTextColor()}`}>
                    {remainingHours.toFixed(1)}h restantes
                </span>
            </div>

            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                    {hoursUsed.toFixed(1)}h utilizadas
                </span>
                <span className="text-sm text-gray-500">
                    {quotaLimit}h disponíveis/mês
                </span>
            </div>

            {percentage >= 90 && (
                <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                        {percentage >= 100
                            ? 'Cota esgotada. Procure a direção do coworking.'
                            : 'Atenção: sua cota está quase esgotada.'}
                    </span>
                </div>
            )}
        </div>
    )
}
