import { PageHeader } from '@/components/ui/page-header'
import { AdminBookingList } from '@/components/admin/AdminBookingList'
import { AdminUserList } from '@/components/admin/AdminUserList'
import { AdminQuotaOverview } from '@/components/admin/AdminQuotaOverview'
import { AdminNotifications } from '@/components/admin/AdminNotifications'
import { CreatePostDialog } from '@/components/mural/CreatePostDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-start mb-4">
                <PageHeader
                    title="Painel Administrativo"
                    subtitle="Gerencie agendamentos, cotas e avisos do escritório."
                />
                <AdminNotifications />
            </div>

            <Tabs defaultValue="bookings" className="w-full">
                <TabsList className="bg-white/20 backdrop-blur-md mb-8 w-full md:w-auto p-1 h-12 flex-wrap">
                    <TabsTrigger value="bookings" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white text-lg h-10 px-6">
                        Agendamentos
                    </TabsTrigger>
                    <TabsTrigger value="quotas" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white text-lg h-10 px-6">
                        Cotas
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white text-lg h-10 px-6">
                        Usuários
                    </TabsTrigger>
                    <TabsTrigger value="mural" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white text-lg h-10 px-6">
                        Mural
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="bookings">
                    <AdminBookingList />
                </TabsContent>

                <TabsContent value="quotas">
                    <AdminQuotaOverview />
                </TabsContent>

                <TabsContent value="users">
                    <AdminUserList />
                </TabsContent>

                <TabsContent value="mural">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <h2 className="text-2xl font-bold text-white">Criar Novo Aviso</h2>
                            <p className="text-white/80 max-w-md">
                                Publique comunicados importantes para que todos os membros do coworking vejam no Mural Digital.
                            </p>
                            <div className="pt-4">
                                <CreatePostDialog onPostCreated={() => alert('Aviso publicado com sucesso!')} />
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

