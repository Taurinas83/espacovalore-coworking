import { useState, useEffect } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from '@/lib/supabase'

// @ts-ignore
import 'moment/locale/pt-br'

// Setup the localizer by providing the moment (or globalize, or Luxon) instance
// to the localizer instance.
moment.locale('pt-br')
const localizer = momentLocalizer(moment)

export interface BookingEvent {
    id: string
    title: string
    start: Date
    end: Date
    resourceId?: string
    bookedBy?: string
}

const messages = {
    allDay: 'Dia todo',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há eventos neste período.',
}

// Custom event component to show booker name
const CustomEvent = ({ event }: { event: BookingEvent }) => (
    <div className="flex flex-col h-full overflow-hidden">
        <div className="font-medium text-xs truncate">{event.title}</div>
        {event.bookedBy && (
            <div className="text-[10px] opacity-80 truncate">por: {event.bookedBy}</div>
        )}
    </div>
)

export function BookingCalendar() {
    const [events, setEvents] = useState<BookingEvent[]>([])
    const [view, setView] = useState(Views.WEEK)
    const [date, setDate] = useState(new Date())

    useEffect(() => {
        fetchBookings()
    }, [])

    const fetchBookings = async () => {
        // Fetch bookings
        const { data: bookingsData, error } = await supabase
            .from('bookings')
            .select('*')

        if (error) {
            console.error('Error fetching bookings:', error)
            return
        }

        if (bookingsData && bookingsData.length > 0) {
            // Fetch profiles for these bookings
            const userIds = [...new Set(bookingsData.map((b: any) => b.user_id))]
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds)

            const formattedEvents: BookingEvent[] = bookingsData.map((booking: any) => {
                const profile = profilesData?.find((p: any) => p.id === booking.user_id)
                return {
                    id: booking.id,
                    title: booking.title || 'Reservado',
                    start: new Date(booking.start_time),
                    end: new Date(booking.end_time),
                    resourceId: booking.room_id,
                    bookedBy: profile?.full_name || undefined
                }
            })
            setEvents(formattedEvents)
        }
    }

    const handleNavigate = (newDate: Date) => {
        setDate(newDate)
    }

    const handleViewChange = (newView: any) => {
        setView(newView)
    }

    return (
        <div className="h-[600px] bg-white p-4 rounded-lg shadow">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}

                // Controlled props
                view={view}
                date={date}
                onNavigate={handleNavigate}
                onView={handleViewChange}

                // Configuration
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                min={new Date(0, 0, 0, 8, 0, 0)} // Start at 8 AM
                max={new Date(0, 0, 0, 20, 0, 0)} // End at 8 PM
                culture='pt-br'
                messages={messages}
                components={{
                    event: CustomEvent,
                }}
                formats={{
                    dayFormat: (date: Date) => {
                        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                        return `${date.getDate()} ${days[date.getDay()]}`
                    },
                    weekdayFormat: (date: Date) => {
                        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                        return days[date.getDay()]
                    },
                    monthHeaderFormat: (date: Date) => {
                        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
                        return `${months[date.getMonth()]} ${date.getFullYear()}`
                    },
                    dayRangeHeaderFormat: ({ start, end }: any) => {
                        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                        return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`
                    },
                }}
            />
        </div>
    )
}
