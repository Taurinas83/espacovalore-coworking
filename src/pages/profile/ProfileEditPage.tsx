import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Upload, User } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export default function ProfileEditPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [fullName, setFullName] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [bio, setBio] = useState('')
    const [photoUrl, setPhotoUrl] = useState('')
    const [phone, setPhone] = useState('')

    // Auth User
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        getProfile()
    }, [])

    const getProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setUserId(user.id)

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (error) {
            console.error(error)
        } else if (data) {
            setFullName(data.full_name || '')
            setCompanyName(data.company_name || '')
            setBio(data.bio || '')
            setPhotoUrl(data.photo_url || '')
            setPhone(data.contact_info?.phone || '')
        }
        setLoading(false)
    }

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setSaving(true)
            if (!event.target.files || event.target.files.length === 0) {
                return
            }
            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload via Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
            setPhotoUrl(data.publicUrl)

        } catch (error: any) {
            alert('Erro ao enviar imagem: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const updates = {
            id: userId,
            full_name: fullName,
            company_name: companyName,
            bio,
            photo_url: photoUrl,
            contact_info: { phone },
            updated_at: new Date(),
        }

        const { error } = await supabase
            .from('profiles')
            .upsert(updates)

        if (error) {
            alert('Erro ao salvar perfil!')
            console.error(error)
        } else {
            alert('Perfil atualizado com sucesso!')
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-white" /></div>

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <PageHeader
                title="Meu Perfil"
                subtitle="Edite suas informações pessoais."
            />
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-secondary">Editar Informações</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">

                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                        <User className="h-10 w-10" />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="photo-upload" className="cursor-pointer bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary/90 flex items-center gap-2 text-sm">
                                    <Upload className="h-4 w-4" /> Alterar Foto
                                </Label>
                                <Input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUpload}
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fullname">Nome Completo</Label>
                            <Input id="fullname" value={fullName} onChange={e => setFullName(e.target.value)} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company">Empresa</Label>
                            <Input id="company" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Remax Valore" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Mini Bio</Label>
                            <Input id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Corretor especialista em..." />
                            {/* Ideally Textarea but Input is fine for MVP */}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">WhatsApp (com DDD)</Label>
                            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="11999999999" />
                        </div>

                        <Button type="submit" className="w-full bg-primary" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
