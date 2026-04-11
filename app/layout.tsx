import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ToastProvider'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'VictoriaLeads',
  description: 'Panel de control del bot de ventas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="es" className={cn("font-sans", geist.variable)}>
        <body>
          {children}
          <ToastProvider />
        </body>
      </html>
    </ClerkProvider>
  )
}
