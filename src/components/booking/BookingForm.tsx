import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertTriangle } from 'lucide-react'
import { QuotaProgressBar } from './QuotaProgressBar'

interface BookingFormProps {
    onBookingSuccess: () => void
}

export function BookingForm({ onBookingSuccess }: BookingFormProps) {
    const [title, setTitle] = useState('')
    const [roomId, setRoomId] = useState('Sala de Reunião 1')
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [requirements, setRequirements] = useState('')

    // User Info Fields
    const [unit, setUnit] = useState('')
    const [companyName, setCompanyName] = useState('')

    // State
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [quotaExceeded, setQuotaExceeded] = useState(false)
    const [refreshQuota, setRefreshQuota] = useState(0)

    useEffect(() => {
        fetchUserProfile()
    }, [])

    const fetchUserProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('assigned_room, company_name')
                .eq('id', user.id)
                .single()

            if (profile) {
                if (profile.assigned_room) setUnit(profile.assigned_room)
                if (profile.company_name) setCompanyName(profile.company_name)
            }
        }
    }

    const checkQuotaAvailable = async (userId: string, bookingHours: number): Promise<boolean> => {
        // Get user's quota
        const { data: profile } = await supabase
            .from('profiles')
            .select('monthly_hours_quota')
            .eq('id', userId)
            .single()

        const quota = profile?.monthly_hours_quota || 10

        // Get current month's usage
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        const { data: bookings } = await supabase
            .from('bookings')
            .select('start_time, end_time')
            .eq('user_id', userId)
            .gte('start_time', monthStart.toISOString())
            .lt('start_time', monthEnd.toISOString())

        const usedHours = bookings?.reduce((acc, booking) => {
            const start = new Date(booking.start_time)
            const end = new Date(booking.end_time)
            return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        }, 0) || 0

        return (usedHours + bookingHours) <= quota
    }

    const checkIntervalConflict = async (roomId: string, startDateTime: Date, endDateTime: Date): Promise<boolean> => {
        const gapMinutes = 30

        // Fetch bookings for the same room on the same day
        const dayStart = new Date(startDateTime)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(startDateTime)
        dayEnd.setHours(23, 59, 59, 999)

        const { data: bookings } = await supabase
            .from('bookings')
            .select('start_time, end_time')
            .eq('room_id', roomId)
            .gte('start_time', dayStart.toISOString())
            .lte('start_time', dayEnd.toISOString())

        if (!bookings || bookings.length === 0) return false

        // Check for 30-minute gap conflicts
        for (const booking of bookings) {
            const existingStart = new Date(booking.start_time)
            const existingEnd = new Date(booking.end_time)

            // New booking starts less than 30 minutes after existing ends
            const gapAfterExisting = (startDateTime.getTime() - existingEnd.getTime()) / (1000 * 60)
            if (gapAfterExisting > 0 && gapAfterExisting < gapMinutes) {
                return true
            }

            // New booking ends less than 30 minutes before existing starts
            const gapBeforeExisting = (existingStart.getTime() - endDateTime.getTime()) / (1000 * 60)
            if (gapBeforeExisting > 0 && gapBeforeExisting < gapMinutes) {
                return true
            }
        }

        return false
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const user = await supabase.auth.getUser()
            if (!user.data.user) throw new Error('User not authenticated')

            if (!unit) throw new Error('Por favor, informe sua Sala.')
            if (!companyName) throw new Error('Por favor, informe sua Empresa.')

            const startDateTime = new Date(`${date}T${startTime}:00`)
            const endDateTime = new Date(`${date}T${endTime}:00`)

            if (startDateTime >= endDateTime) {
                throw new Error('Horário de término deve ser após o início')
            }

            const bookingHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)

            // Check quota
            const quotaOk = await checkQuotaAvailable(user.data.user.id, bookingHours)
            if (!quotaOk) {
                setQuotaExceeded(true)
                throw new Error('Sua cota mensal de horas foi excedida. Entre em contato com a direção do coworking para liberar mais horas.')
            }

            // Check 30-minute interval
            const hasConflict = await checkIntervalConflict(roomId, startDateTime, endDateTime)
            if (hasConflict) {
                throw new Error('É necessário um intervalo mínimo de 30 minutos entre agendamentos na mesma sala.')
            }

            const { error: dbError } = await supabase
                .from('bookings')
                .insert({
                    title,
                    room_id: roomId,
                    user_id: user.data.user.id,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    user_unit: unit,
                    user_company_name: companyName,
                    requirements: requirements || null
                })

            if (dbError) throw dbError

            setTitle('')
            setStartTime('')
            setEndTime('')
            setRequirements('')
            setRefreshQuota(prev => prev + 1)
            onBookingSuccess()
            alert('Reserva realizada com sucesso!')

        } catch (err: any) {
            setError(err.message || 'Erro ao criar reserva')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Quota Progress */}
            <QuotaProgressBar key={refreshQuota} />

            <Card>
                <CardHeader>
                    <CardTitle>Nova Reserva</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Room Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="room-select">Local da Reunião</Label>
                            <select
                                id="room-select"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                            >
                                <option value="Sala de Reunião 1">Sala de Reunião 1</option>
                                <option value="Sala de Reunião 2">Sala de Reunião 2</option>
                                <option value="Auditório">Auditório</option>
                            </select>
                        </div>

                        {/* User Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit">Sua Sala (Unidade)</Label>
                                <Select onValueChange={setUnit} value={unit}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sala..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                                            <SelectItem key={num} value={String(num).padStart(2, '0')}>
                                                Sala {String(num).padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Sua Empresa</Label>
                                <Input
                                    id="company"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Nome da Empresa"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Título / Finalidade</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Reunião com cliente..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Data</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start">Início</Label>
                                <Input
                                    id="start"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end">Témino</Label>
                                <Input
                                    id="end"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Requirements Field */}
                        <div className="space-y-2">
                            <Label htmlFor="requirements">Necessidades para a reunião (opcional)</Label>
                            <textarea
                                id="requirements"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                                placeholder="Ex.: Café, água, biscoitos, projetor..."
                            />
                            <p className="text-xs text-gray-500">
                                Informe o que você vai precisar para sua reunião.
                            </p>
                        </div>

                        {error && (
                            <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${quotaExceeded ? 'bg-red-50 text-red-700' : 'bg-red-50 text-red-600'}`}>
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Reservar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
