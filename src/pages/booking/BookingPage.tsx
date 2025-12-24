import { useState } from 'react'
import { BookingCalendar } from '@/components/booking/BookingCalendar'
import { BookingForm } from '@/components/booking/BookingForm'
import { UserBookingHistory } from '@/components/user/UserBookingHistory'
import { PageHeader } from '@/components/ui/page-header'

export default function BookingPage() {
    const [refreshKey, setRefreshKey] = useState(0)

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <PageHeader
                title="Agendamento de Salas"
                subtitle="Reserve salas de reunião e atendimento."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <BookingCalendar key={refreshKey} />
                    <UserBookingHistory onBookingCancelled={handleSuccess} />
                </div>
                <div>
                    <BookingForm onBookingSuccess={handleSuccess} />
                </div>
            </div>
        </div>
    )
}

