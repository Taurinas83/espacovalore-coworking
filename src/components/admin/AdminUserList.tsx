import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Search, MapPin, Trash2, ShieldCheck, ShieldOff, KeyRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Profile {
    id: string
    full_name: string
    email?: string
    company_name: string
    photo_url: string
    is_approved: boolean
    assigned_room: string
    is_admin: boolean
}

export function AdminUserList() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        fetchProfiles()
        getCurrentUser()
    }, [])

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUserId(user.id)
    }

    const fetchProfiles = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true })

        if (error) {
            console.error('Erro ao buscar usuários:', error)
        } else {
            setProfiles(data || [])
        }
        setLoading(false)
    }

    const toggleApproval = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: !currentStatus })
            .eq('id', id)

        if (error) {
            alert('Erro ao atualizar: ' + error.message)
        } else {
            setProfiles(profiles.map(p => p.id === id ? { ...p, is_approved: !currentStatus } : p))
        }
    }

    const toggleAdmin = async (id: string, currentStatus: boolean) => {
        // Prevent removing own admin status
        if (id === currentUserId && currentStatus) {
            alert('Você não pode remover seu próprio status de administrador.')
            return
        }

        const action = currentStatus ? 'remover o status de administrador de' : 'tornar administrador'
        if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return

        const { error } = await supabase
            .from('profiles')
            .update({ is_admin: !currentStatus })
            .eq('id', id)

        if (error) {
            alert('Erro ao atualizar: ' + error.message)
        } else {
            setProfiles(profiles.map(p => p.id === id ? { ...p, is_admin: !currentStatus } : p))
        }
    }

    const deleteUser = async (id: string) => {
        if (id === currentUserId) {
            alert('Você não pode excluir sua própria conta.')
            return
        }

        if (!confirm("Tem certeza que deseja excluir este usuário? Essa ação removerá agendamentos e dados do perfil.")) return;

        const { error: rpcError } = await supabase.rpc('delete_user_by_id', { user_uuid: id });

        if (rpcError) {
            console.log("RPC delete falhou, tentando delete direto.", rpcError);
            const { error: tableError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id)

            if (tableError) {
                alert('Erro ao excluir: ' + tableError.message)
                return
            }
        }

        setProfiles(profiles.filter(p => p.id !== id))
    }

    const resetPassword = async (profile: Profile) => {
        if (!profile.email) {
            alert('Este usuário não possui email cadastrado.')
            return
        }

        if (!confirm(`Deseja enviar um link de redefinição de senha para ${profile.email}?`)) return

        const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
            redirectTo: `${window.location.origin}/login`,
        })

        if (error) {
            alert('Erro ao enviar email: ' + error.message)
        } else {
            alert(`Email de redefinição de senha enviado para ${profile.email}`)
        }
    }

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-white" /></div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Gerenciar Usuários</h2>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar usuário..."
                        className="pl-10 bg-white/90 backdrop-blur-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-3">
                {filteredProfiles.map(profile => (
                    <Card key={profile.id} className="bg-white/90 backdrop-blur-sm">
                        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                                    {profile.photo_url ? (
                                        <img src={profile.photo_url} alt={profile.full_name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-slate-500 font-bold text-lg">{profile.full_name?.[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-800">{profile.full_name}</h3>
                                        {profile.is_admin && <Badge variant="secondary" className="bg-slate-800 text-white hover:bg-slate-700">Admin</Badge>}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        {profile.assigned_room && (
                                            <span className="flex items-center gap-1 font-medium text-slate-700">
                                                <MapPin className="h-3 w-3" /> Sala {profile.assigned_room}
                                            </span>
                                        )}
                                        {profile.company_name && <span>{profile.company_name}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                {/* Admin Toggle */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={profile.is_admin
                                        ? "text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100"
                                        : "text-gray-500 border-gray-200 hover:bg-gray-100"
                                    }
                                    onClick={() => toggleAdmin(profile.id, profile.is_admin)}
                                    disabled={profile.id === currentUserId && profile.is_admin}
                                    title={profile.is_admin ? "Remover admin" : "Tornar admin"}
                                >
                                    {profile.is_admin ? (
                                        <><ShieldCheck className="mr-1 h-4 w-4" /> Admin</>
                                    ) : (
                                        <><ShieldOff className="mr-1 h-4 w-4" /> Usuário</>
                                    )}
                                </Button>

                                {/* Approval Toggle */}
                                {profile.is_approved ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700"
                                        onClick={() => toggleApproval(profile.id, true)}
                                    >
                                        <CheckCircle className="mr-1 h-4 w-4" /> Aprovado
                                    </Button>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="bg-red-500 hover:bg-red-600"
                                        onClick={() => toggleApproval(profile.id, false)}
                                    >
                                        <XCircle className="mr-1 h-4 w-4" /> Pendente
                                    </Button>
                                )}

                                {/* Reset Password */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                    onClick={() => resetPassword(profile)}
                                    title="Resetar Senha"
                                >
                                    <KeyRound className="h-4 w-4" />
                                </Button>

                                {/* Delete */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => deleteUser(profile.id)}
                                    title="Excluir Usuário"
                                    disabled={profile.id === currentUserId}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

