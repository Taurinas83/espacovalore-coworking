import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, Check, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notification {
    id: string
    created_at: string
    type: string
    title: string
    message: string
    is_read: boolean
    reference_id?: string
}

export function UserNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        fetchNotifications()

        // Subscribe to real-time updates
        const channel = supabase
            .channel('user_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_notifications' },
                (payload) => {
                    // Only add if it's for current user (can't filter here but RLS handles it)
                    setNotifications(prev => [payload.new as Notification, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('user_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30)

        if (!error && data) {
            setNotifications(data)
        }
        setLoading(false)
    }

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('id', id)

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            )
        }
    }

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
        if (unreadIds.length === 0) return

        const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .in('id', unreadIds)

        if (!error) {
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            )
        }
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'new_announcement':
                return <Megaphone className="h-4 w-4 text-blue-500" />
            default:
                return <Bell className="h-4 w-4 text-gray-500" />
        }
    }

    return (
        <div className="relative">
            {/* Bell Icon Button */}
            <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:bg-white/20"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-[70vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Notificações</h3>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                    onClick={markAllAsRead}
                                >
                                    <Check className="h-3 w-3 mr-1" />
                                    Marcar todas como lidas
                                </Button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">
                                    Carregando...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p>Nenhuma notificação</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''
                                            }`}
                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''} text-gray-800`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {format(new Date(notification.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
