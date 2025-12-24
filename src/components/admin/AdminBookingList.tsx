import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Calendar, Clock, User, Search, Coffee } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Booking {
    id: string
    room_id: string
    start_time: string
    end_time: string
    title: string
    user_id: string
    user_unit?: string
    user_company_name?: string
    requirements?: string
    profile?: {
        full_name: string
        company_name?: string
        assigned_room?: string
    }
}

export function AdminBookingList() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [showPast, setShowPast] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchBookings()
    }, [showPast])

    const fetchBookings = async () => {
        setLoading(true)

        let query = supabase
            .from('bookings')
            .select('*')
            .order('start_time', { ascending: !showPast })

        if (!showPast) {
            query = query.gte('start_time', new Date().toISOString())
        } else {
            query = query.lt('start_time', new Date().toISOString())
        }

        const { data: bookingsData, error: bookingsError } = await query.limit(50)

        if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError)
            setLoading(false)
            return
        }

        if (!bookingsData || bookingsData.length === 0) {
            setBookings([])
            setLoading(false)
            return
        }

        // Fetch profiles for these bookings
        const userIds = [...new Set(bookingsData.map(b => b.user_id))]
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, company_name')
            .in('id', userIds)

        // Merge data
        const mergedBookings = bookingsData.map(booking => {
            const profile = profilesData?.find(p => p.id === booking.user_id)
            return {
                ...booking,
                profile
            }
        })

        setBookings(mergedBookings)
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return

        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Erro ao cancelar: ' + error.message)
        } else {
            fetchBookings()
        }
    }

    const filteredBookings = bookings.filter(booking =>
        booking.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user_company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.room_id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-white" /></div>


    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold text-white">
                    {showPast ? 'Histórico de Agendamentos' : 'Próximos Agendamentos'}
                </h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar..."
                            className="pl-10 bg-white/90 backdrop-blur-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant={!showPast ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowPast(false)}
                        className={!showPast ? "bg-white text-primary" : "bg-white/20 text-white border-white/30"}
                    >
                        Próximos
                    </Button>
                    <Button
                        variant={showPast ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowPast(true)}
                        className={showPast ? "bg-white text-primary" : "bg-white/20 text-white border-white/30"}
                    >
                        Histórico
                    </Button>
                </div>
            </div>

            {filteredBookings.length === 0 && (
                <div className="text-center py-8 bg-white/10 rounded-lg border border-white/20">
                    <p className="text-white/70">
                        {showPast ? 'Nenhum agendamento passado encontrado.' : 'Nenhum agendamento futuro encontrado.'}
                    </p>
                </div>
            )}

            <div className="grid gap-4">
                {filteredBookings.map(booking => (
                    <Card key={booking.id} className="bg-white/90 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(booking.start_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        <span className="text-gray-400">|</span>
                                        <Clock className="h-4 w-4" />
                                        {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                                    </div>
                                    <div className="font-semibold text-lg">{booking.room_id}</div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <User className="h-4 w-4" />
                                        {booking.profile?.full_name || 'Usuário Desconhecido'}
                                        {(booking.user_company_name || booking.profile?.company_name) && (
                                            <span className="text-gray-400">({booking.user_company_name || booking.profile?.company_name})</span>
                                        )}
                                        {(booking.user_unit || (booking.profile as any)?.assigned_room) && (
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                                                Sala {booking.user_unit || (booking.profile as any)?.assigned_room}
                                            </span>
                                        )}
                                    </div>
                                    {booking.title && (
                                        <div className="text-sm italic text-gray-500">"{booking.title}"</div>
                                    )}

                                    {/* Requirements Display */}
                                    {booking.requirements && (
                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                            <div className="flex items-start gap-2 text-sm">
                                                <Coffee className="h-4 w-4 text-amber-600 mt-0.5" />
                                                <div>
                                                    <span className="font-medium text-amber-800">Necessidades:</span>
                                                    <p className="text-amber-700">{booking.requirements}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!showPast && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(booking.id)}
                                        className="shrink-0"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" /> Cancelar
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

