import type { ReactNode } from 'react'

interface MainLayoutProps {
    children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen w-full relative">
            {/* Background Image */}
            <div
                className="fixed inset-0 z-[-2] w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/assets/system-bg.png')" }}
            />

            {/* Blue Overlay & Blur */}
            <div className="fixed inset-0 z-[-1] w-full h-full bg-white/40 backdrop-blur-md" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
