import type { Metadata, Viewport } from 'next'
import { Noto_Sans, Noto_Serif } from 'next/font/google'
import { SettingsProvider } from '@/lib/settings'
import './globals.css'

const notoSans = Noto_Sans({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
})

const notoSerif = Noto_Serif({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-serif',
})

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Цагийн Залбирал | Католик Шашны Өдөр Тутмын Залбирал',
  description:
    'Монгол дахь Католик итгэгчдэд зориулсан цагийн залбирлын апп',
  openGraph: {
    title: 'Цагийн Залбирал',
    description:
      'Монгол дахь Католик итгэгчдэд зориулсан цагийн залбирлын апп',
    locale: 'mn_MN',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${notoSans.variable} ${notoSerif.variable} font-sans`}>
        <div className="flex min-h-screen flex-col bg-stone-50 text-stone-800 dark:bg-neutral-950 dark:text-stone-200 transition-colors">
          <SettingsProvider>
            <main className="flex-1">{children}</main>
          </SettingsProvider>
        </div>
      </body>
    </html>
  )
}
