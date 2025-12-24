import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, type ReactElement } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import BookingPage from './pages/booking/BookingPage'
import NetworkingPage from './pages/networking/NetworkingPage'
import ProfileEditPage from './pages/profile/ProfileEditPage'
import MuralPage from './pages/mural/MuralPage'
import AdminPage from './pages/admin/AdminPage'
import { MainLayout } from './components/layout/MainLayout'
import { UserNotifications } from './components/user/UserNotifications'
import { Loader2, Users, UserCircle, Megaphone, ShieldCheck } from 'lucide-react'

function ProtectedRoute({ children, session }: { children: ReactElement, session: Session | null }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AdminRoute({ children, session, isAdmin }: { children: ReactElement, session: Session | null, isAdmin: boolean }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkAdmin(session.user.id)
      else setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkAdmin(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    setIsAdmin(!!data?.is_admin)
    setLoading(false)
  }

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!session ? <SignupPage /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={
            <ProtectedRoute session={session}>
              <MainLayout>
                <div className="p-8">
                  <div className="mb-8 flex justify-between items-center px-2">
                    <div>
                      <h1 className="text-3xl font-bold text-white drop-shadow-md mb-2">
                        Bem-vindo ao <span className="text-white drop-shadow-sm-white">Espaço Valore Coworking</span>
                      </h1>
                      <p className="text-white/90 drop-shadow-md text-lg">Seu hub de produtividade e conexões.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <UserNotifications />
                      <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
                        <img src="/assets/logo.png" alt="Logo" className="h-full w-auto object-contain" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group" onClick={() => window.location.href = '/booking'}>
                      <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#DC3C3C] transition-colors">
                        <Users className="h-6 w-6 text-[#DC3C3C] group-hover:text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">Agendamento de Salas</h2>
                      <p className="text-slate-500">Reserve espaços para reuniões e atendimentos de forma rápida.</p>
                    </div>

                    <div className="p-8 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group" onClick={() => window.location.href = '/mural'}>
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#003DA5] transition-colors">
                        <Megaphone className="h-6 w-6 text-[#003DA5] group-hover:text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">Mural Digital</h2>
                      <p className="text-slate-500">Fique por dentro das últimas notícias e avisos importantes.</p>
                    </div>

                    <div className="p-8 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group" onClick={() => window.location.href = '/networking'}>
                      <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                        <Users className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">Comunidade & Networking</h2>
                      <p className="text-slate-500">Encontre colegas, parceiros e troque cartões digitais.</p>
                    </div>

                    <div className="p-8 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group" onClick={() => window.location.href = '/profile'}>
                      <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-800 transition-colors">
                        <UserCircle className="h-6 w-6 text-slate-700 group-hover:text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">Meu Perfil</h2>
                      <p className="text-slate-500">Gerencie suas informações e foto de perfil.</p>
                    </div>

                    {isAdmin && (
                      <div className="p-8 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-red-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group" onClick={() => window.location.href = '/admin'}>
                        <div className="h-12 w-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-black transition-colors">
                          <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Painel Administrativo</h2>
                        <p className="text-slate-500">Gerenciar agendamentos e avisos gerais.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-12 text-center">
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="px-6 py-2 bg-white/80 text-red-600 border border-red-200 rounded-full hover:bg-red-50 hover:border-red-300 font-medium transition-colors"
                    >
                      Encerrar Sessão
                    </button>
                  </div>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking"
          element={
            <ProtectedRoute session={session}>
              <MainLayout>
                <BookingPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/networking"
          element={
            <ProtectedRoute session={session}>
              <MainLayout>
                <NetworkingPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute session={session}>
              <MainLayout>
                <ProfileEditPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mural"
          element={
            <ProtectedRoute session={session}>
              <MainLayout>
                <MuralPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute session={session} isAdmin={isAdmin}>
              <MainLayout>
                <AdminPage />
              </MainLayout>
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
