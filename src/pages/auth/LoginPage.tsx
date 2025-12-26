import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            let errorMessage = error.message
            if (errorMessage.includes("Email not confirmed")) {
                errorMessage = "Email não confirmado. Verifique sua caixa de entrada."
            } else if (errorMessage.includes("Invalid login credentials")) {
                errorMessage = "Email ou senha incorretos."
            }

            setError(errorMessage)
            setLoading(false)
        } else {
            // User authenticated successfully - navigate to home
            if (data.session) {
                navigate('/')
            } else {
                setLoading(false)
            }
        }
    }

    return (
        <div className="min-h-screen w-full relative">
            {/* Full Screen Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/assets/login-bg.png')" }}
            />

            {/* Right side container - Centered content */}
            <div className="absolute inset-y-0 right-0 w-full md:w-[55%] bg-gradient-to-l from-white/95 via-white/80 to-transparent flex items-center justify-center">
                <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 backdrop-blur-md mx-4">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-6 flex items-center justify-center">
                            <img src="/assets/logo.png" alt="Remax Logo" className="h-16 w-auto" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-slate-800">Bem-vindo</CardTitle>
                        <CardDescription className="text-base text-slate-600">
                            Faça login para acessar o Espaço Valore Coworking
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 font-medium">Email Corporativo</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@remaxvalore.com.br"
                                    className="h-11 bg-white/50 border-slate-300 focus:border-red-600 focus:ring-red-600"
                                    value={email}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 font-medium">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    className="h-11 bg-white/50 border-slate-300 focus:border-red-600 focus:ring-red-600"
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
                            <Button type="submit" className="w-full h-11 text-base bg-[#DC3C3C] hover:bg-[#b92b2b] text-white font-semibold transition-all shadow-md hover:shadow-lg" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Acessar Sistema'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center pt-2 pb-6">
                        <p className="text-sm text-slate-500">
                            Novo por aqui? <Link to="/signup" className="text-[#003DA5] hover:text-[#002f80] font-semibold hover:underline">Solicitar Acesso</Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
