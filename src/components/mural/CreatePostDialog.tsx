import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import { Loader2, Plus } from 'lucide-react'

interface CreatePostDialogProps {
    onPostCreated: () => void
}

export function CreatePostDialog({ onPostCreated }: CreatePostDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')

    const handlePost = async () => {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // First check if user is admin (Backend RLS will also fail, but good for UI feedback)
        // Actually RLS is enough, but we should handle the error gracefully.

        const { error } = await supabase
            .from('announcements')
            .insert({
                title,
                content,
                author_id: user.id
            })

        if (error) {
            alert('Erro ao criar post: ' + error.message)
        } else {
            setTitle('')
            setContent('')
            setOpen(false)
            onPostCreated()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Postagem
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Aviso</DialogTitle>
                    <DialogDescription>
                        Crie um comunicado para todo o time visualizar.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Manutenção no Ar Condicionado" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="content">Conteúdo</Label>
                        <Textarea id="content" value={content} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)} placeholder="Detalhes do aviso..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handlePost} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Publicar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
