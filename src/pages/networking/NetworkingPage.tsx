import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { type Profile, ProfileCard } from '@/components/networking/ProfileCard'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'

export default function NetworkingPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchProfiles()
    }, [])

    const fetchProfiles = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name')

        if (error) {
            console.error('Error fetching profiles:', error)
        } else {
            setProfiles(data || [])
        }
        setLoading(false)
    }

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <PageHeader
                title="Comunidade"
                subtitle="Conecte-se com outros profissionais."
            >
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nome..."
                        className="pl-10 bg-white/90 backdrop-blur-sm border-white/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </PageHeader>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProfiles.map(profile => (
                        <ProfileCard key={profile.id} profile={profile} />
                    ))}
                    {filteredProfiles.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-12">
                            Nenhum perfil encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
