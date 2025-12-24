import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CreatePostDialog } from '@/components/mural/CreatePostDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Calendar } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

interface Announcement {
    id: string
    title: string
    content: string
    created_at: string
}

export default function MuralPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        checkAdmin()
        fetchAnnouncements()
    }, [])

    const checkAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        setIsAdmin(!!data?.is_admin)
    }

    const fetchAnnouncements = async () => {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
        } else {
            setAnnouncements(data || [])
        }
        setLoading(false)
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <PageHeader
                title="Mural de Avisos"
                subtitle="Fique por dentro das novidades do escritório."
            >
                {isAdmin && <CreatePostDialog onPostCreated={fetchAnnouncements} />}
            </PageHeader>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    {announcements.map(post => (
                        <Card key={post.id} className="border-l-4 border-l-primary">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl text-secondary">{post.title}</CardTitle>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(post.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-gray-700">{post.content}</p>
                            </CardContent>
                        </Card>
                    ))}

                    {announcements.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                            <p className="text-gray-500">Nenhum aviso postado ainda.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
