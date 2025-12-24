import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react'
import { format, isAfter, addHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Booking {
    id: string
    room_id: string
    start_time: string
    end_time: string
    title: string
    requirements?: string
    created_at: string
}

interface UserBookingHistoryProps {
    onBookingCancelled?: () => void
}

export function UserBookingHistory({ onBookingCancelled }: UserBookingHistoryProps) {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [showPast, setShowPast] = useState(false)

    useEffect(() => {
        fetchBookings()
    }, [showPast])

    const fetchBookings = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setLoading(false)
            return
        }

        let query = supabase
            .from('bookings')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: !showPast })

        if (!showPast) {
            query = query.gte('start_time', new Date().toISOString())
        } else {
            query = query.lt('start_time', new Date().toISOString())
        }

        const { data, error } = await query.limit(20)

        if (error) {
            console.error('Error fetching bookings:', error)
        } else {
            setBookings(data || [])
        }
        setLoading(false)
    }

    const canCancel = (startTime: string): boolean => {
        const bookingStart = new Date(startTime)
        const cancelDeadline = addHours(new Date(), 24)
        return isAfter(bookingStart, cancelDeadline)
    }

    const handleCancel = async (id: string, startTime: string) => {
        if (!canCancel(startTime)) {
            alert('Você só pode cancelar agendamentos com mais de 24 horas de antecedência. Entre em contato com a administração.')
            return
        }

        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return

        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Erro ao cancelar: ' + error.message)
        } else {
            fetchBookings()
            onBookingCancelled?.()
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-primary" />
            </div>
        )
    }

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Meus Agendamentos</h3>
                    <div className="flex gap-2">
                        <Button
                            variant={!showPast ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowPast(false)}
                        >
                            Próximos
                        </Button>
                        <Button
                            variant={showPast ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowPast(true)}
                        >
                            Histórico
                        </Button>
                    </div>
                </div>

                {bookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>{showPast ? 'Nenhum agendamento passado.' : 'Nenhum agendamento futuro.'}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {bookings.map(booking => {
                            const isPast = new Date(booking.start_time) < new Date()
                            const cancellable = canCancel(booking.start_time)

                            return (
                                <div
                                    key={booking.id}
                                    className={`p-4 rounded-lg border ${isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-primary font-semibold">
                                                <Calendar className="h-4 w-4" />
                                                {format(new Date(booking.start_time), "dd 'de' MMMM", { locale: ptBR })}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock className="h-4 w-4" />
                                                {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="h-4 w-4" />
                                                {booking.room_id}
                                            </div>
                                            {booking.title && (
                                                <p className="text-sm text-gray-500 italic">"{booking.title}"</p>
                                            )}
                                            {booking.requirements && (
                                                <p className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded mt-2">
                                                    📋 {booking.requirements}
                                                </p>
                                            )}
                                        </div>

                                        {!isPast && (
                                            <div className="flex flex-col items-end gap-2">
                                                {cancellable ? (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleCancel(booking.id, booking.start_time)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Cancelar
                                                    </Button>
                                                ) : (
                                                    <div className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled
                                                            className="opacity-50"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            Cancelar
                                                        </Button>
                                                        <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Menos de 24h
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
