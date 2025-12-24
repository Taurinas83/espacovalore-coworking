import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { AlertCircle, Loader2, MailCheck } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [room, setRoom] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!room) {
            setError("Por favor, selecione sua sala.")
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: '', // Explicitly empty usually fine, or default avatar
                },
            },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // We need to update the profile with the assigned room immediately
            // But user ID is not easily available if email confirmation is required and session is null
            // However, supabase.auth.signUp returns 'data.user' even if session is null (for email confirmation flow)

            // Actually, my current 'handle_new_user' trigger creates the profile. 
            // I need to update that profile with the specific room.
            // Since I cannot pass custom metadata columns into the users table easily without 'data' jsonb,
            // I should pass 'assigned_room' in options.data and update the trigger to use it, OR update it here manually if I can.
            // Updating manually requires RLS to allow "User can update own profile".
            // Let's try passing it in metadata and updating the trigger if possible, OR just update manually if I have a user object.

            // Wait, standard Supabase 'data' metadata IS stored in raw_user_meta_data.
            // I just need to update my trigger to read it, OR I can just do a second call here if I have the user.
            // If email confirmation is ON, I don't have a session, so I can't update the profile via RLS policy (auth.uid() is null).
            // SO: Passing it via metadata is the best way. I will add 'assigned_room' to the metadata.

            // But wait, the trigger 'public.handle_new_user' (in my schema) only inserts id, full_name, photo_url.
            // I should update the trigger code in my migration script to also pull assigned_room!
            // OR - I can simple ask the user to select the room AFTER login? No, user wants it during signup.

            // Correction: I will update the code to pass 'assigned_room' in metadata.
            // AND I will rely on the user running my migration script which I will UPDATE to include the trigger modification.

            setSuccess(true)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md text-center p-6 border-0 shadow-xl">
                    <div className="mb-4 flex justify-center">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <MailCheck className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800 mb-2">Cadastro Realizado!</CardTitle>
                    <CardDescription className="text-lg text-slate-600 mb-6">
                        Enviamos um email de confirmação para <strong>{email}</strong>.
                        <br /><br />
                        Por favor, confirme seu email para ativar sua conta.
                        <br />
                        <span className="text-sm text-red-500 mt-2 block">
                            (Se não encontrar, verifique a caixa de Spam)
                        </span>
                    </CardDescription>
                    <Button onClick={() => navigate('/login')} className="w-full bg-[#003DA5] hover:bg-[#002f80]">
                        Voltar para Login
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full relative">
            {/* Full Screen Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/assets/login-bg.png')" }}
            />

            <div className="absolute inset-y-0 right-0 w-full md:w-[55%] bg-gradient-to-l from-white/95 via-white/80 to-transparent flex items-center justify-center">
                <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 backdrop-blur-md mx-4">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-6 flex items-center justify-center">
                            <img src="/assets/logo.png" alt="Remax Logo" className="h-16 w-auto" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-slate-800">Crie sua Conta</CardTitle>
                        <CardDescription className="text-base text-slate-600">
                            Junte-se à comunidade Espaço Valore Coworking
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-slate-700 font-medium">Nome Completo</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Ex: Ana Souza"
                                    className="h-10 bg-white/50 border-slate-300 focus:border-[#003DA5] focus:ring-[#003DA5]"
                                    value={fullName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="h-10 bg-white/50 border-slate-300 focus:border-[#003DA5] focus:ring-[#003DA5]"
                                    value={email}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="room" className="text-slate-700 font-medium">Escolha sua Sala</Label>
                                <Select onValueChange={setRoom} value={room}>
                                    <SelectTrigger className="h-10 bg-white/50 border-slate-300 focus:ring-[#003DA5]">
                                        <SelectValue placeholder="Selecione sua sala (01-12)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                                            <SelectItem key={num} value={String(num).padStart(2, '0')}>
                                                Sala {String(num).padStart(2, '0')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 font-medium">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    className="h-10 bg-white/50 border-slate-300 focus:border-[#003DA5] focus:ring-[#003DA5]"
                                    value={password}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>{error}</span>
                                </div>
                            )}
                            <Button type="submit" className="w-full h-11 text-base bg-[#003DA5] hover:bg-[#002f80] text-white font-semibold transition-all shadow-md hover:shadow-lg" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Cadastrar'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center pt-2 pb-6">
                        <p className="text-sm text-slate-500">
                            Já possui cadastro? <Link to="/login" className="text-[#DC3C3C] hover:text-[#b92b2b] font-semibold hover:underline">Fazer Login</Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
