import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, User } from 'lucide-react'

export interface Profile {
    id: string
    full_name: string
    company_name: string
    bio: string
    photo_url: string
    contact_info: any
}

interface ProfileCardProps {
    profile: Profile
}

export function ProfileCard({ profile }: ProfileCardProps) {
    const whatsappLink = profile.contact_info?.phone
        ? `https://wa.me/${profile.contact_info.phone.replace(/\D/g, '')}`
        : '#'

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {profile.photo_url ? (
                        <img src={profile.photo_url} alt={profile.full_name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <User className="h-8 w-8" />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-secondary leading-none">{profile.full_name}</h3>
                    <p className="text-sm text-primary font-medium mt-1">{profile.company_name || 'Membro Valore'}</p>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4 h-15">
                    {profile.bio || 'Sem biografia.'}
                </p>
                <Button
                    variant="outline"
                    className="w-full gap-2 border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => window.open(whatsappLink, '_blank')}
                    disabled={!profile.contact_info?.phone}
                >
                    <MessageCircle className="h-4 w-4" />
                    Conversar
                </Button>
            </CardContent>
        </Card>
    )
}
