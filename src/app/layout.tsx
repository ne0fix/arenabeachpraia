import type { Metadata } from 'next'
import { Lexend, Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/views/providers/QueryProvider'
import { SessionProvider } from '@/views/providers/SessionProvider'
import { AuthSyncProvider } from '@/views/providers/AuthSyncProvider'
import { auth } from '@/auth'

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-headline',
})

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Arena Beach Serra',
  description: 'Agende sua quadra de beach sports com facilidade.',
  metadataBase: new URL('https://www.arenabeachserra.com.br'),
  openGraph: {
    title: 'Arena Beach Serra',
    description: 'Agende sua quadra de beach sports com facilidade.',
    url: 'https://www.arenabeachserra.com.br',
    siteName: 'Arena Beach Serra',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Arena Beach Serra',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arena Beach Serra',
    description: 'Agende sua quadra de beach sports com facilidade.',
    images: ['/og-image.png'],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="pt-BR" className={`${lexend.variable} ${beVietnamPro.variable}`}>
      <body className="antialiased">
        <SessionProvider session={session}>
          <QueryProvider>
            <AuthSyncProvider>{children}</AuthSyncProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
