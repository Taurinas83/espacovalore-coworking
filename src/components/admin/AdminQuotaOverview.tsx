import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Search, MapPin, Building2, Clock } from 'lucide-react'

interface UserWithQuota {
    id: string
    full_name: string
    company_name?: string
    assigned_room?: string
    monthly_hours_quota: number
    hours_used: number
}

export function AdminQuotaOverview() {
    const [users, setUsers] = useState<UserWithQuota[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState<'name' | 'usage'>('usage')

    useEffect(() => {
        fetchUsersWithQuotas()
    }, [])

    const fetchUsersWithQuotas = async () => {
        setLoading(true)

        // Fetch all users
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, company_name, assigned_room, monthly_hours_quota')
            .order('full_name')

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
            setLoading(false)
            return
        }

        // Calculate hours used for each user this month
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        const { data: bookings } = await supabase
            .from('bookings')
            .select('user_id, start_time, end_time')
            .gte('start_time', monthStart.toISOString())
            .lt('start_time', monthEnd.toISOString())

        // Calculate hours per user
        const hoursPerUser: Record<string, number> = {}
        bookings?.forEach(booking => {
            const start = new Date(booking.start_time)
            const end = new Date(booking.end_time)
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
            hoursPerUser[booking.user_id] = (hoursPerUser[booking.user_id] || 0) + hours
        })

        // Merge data
        const usersWithQuotas: UserWithQuota[] = (profiles || []).map(profile => ({
            id: profile.id,
            full_name: profile.full_name || 'Sem nome',
            company_name: profile.company_name,
            assigned_room: profile.assigned_room,
            monthly_hours_quota: profile.monthly_hours_quota || 10,
            hours_used: Math.round((hoursPerUser[profile.id] || 0) * 100) / 100
        }))

        setUsers(usersWithQuotas)
        setLoading(false)
    }

    const filteredUsers = users
        .filter(user =>
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'usage') {
                return (b.hours_used / b.monthly_hours_quota) - (a.hours_used / a.monthly_hours_quota)
            }
            return a.full_name.localeCompare(b.full_name)
        })

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-white" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Controle de Cotas Mensais
                </h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar usuário..."
                            className="pl-10 bg-white/90 backdrop-blur-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-3 py-2 rounded-md bg-white/90 text-sm border border-gray-200"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as 'name' | 'usage')}
                    >
                        <option value="usage">Maior uso</option>
                        <option value="name">Nome</option>
                    </select>
                </div>
            </div>

            {filteredUsers.length === 0 && (
                <div className="text-center py-8 bg-white/10 rounded-lg border border-white/20">
                    <p className="text-white/70">Nenhum usuário encontrado.</p>
                </div>
            )}

            <div className="grid gap-3">
                {filteredUsers.map(user => {
                    const percentage = (user.hours_used / user.monthly_hours_quota) * 100

                    return (
                        <Card key={user.id} className="bg-white/90 backdrop-blur-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-slate-800 truncate">
                                            {user.full_name}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                            {user.assigned_room && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    Sala {user.assigned_room}
                                                </span>
                                            )}
                                            {user.company_name && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" />
                                                    {user.company_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-full md:w-64">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={
                                                percentage >= 90 ? 'text-red-600 font-bold' :
                                                    percentage >= 70 ? 'text-yellow-600 font-semibold' :
                                                        'text-green-600'
                                            }>
                                                {user.hours_used.toFixed(1)}h / {user.monthly_hours_quota}h
                                            </span>
                                            <span className="text-gray-400">
                                                {Math.round(percentage)}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${percentage >= 90 ? 'bg-red-500' :
                                                    percentage >= 70 ? 'bg-yellow-500' :
                                                        'bg-green-500'
                                                    }`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
