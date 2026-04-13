import type { Metadata, Viewport } from 'next'
import { Noto_Sans, Noto_Serif } from 'next/font/google'
import { SettingsProvider } from '@/lib/settings'
import { SwRegistrar } from '@/components/sw-registrar'
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
  themeColor: '#2d6a4f',
}

export const metadata: Metadata = {
  title: 'Цагийн Залбирал | Католик Шашны Өдөр Тутмын Залбирал',
  description:
    'Монгол дахь Католик итгэгчдэд зориулсан цагийн залбирлын апп',
  applicationName: 'Цагийн Залбирал',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Цагийн Залбирал',
  },
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
                try {
                  var root = document.documentElement;
                  var raw = localStorage.getItem('loth-settings');
                  var s = raw ? JSON.parse(raw) : {};
                  root.dataset.fontSize = s.fontSize || 'md';
                  root.dataset.fontFamily = s.fontFamily || 'sans';
                  var theme = s.theme || localStorage.getItem('theme') || 'system';
                  var dark = theme === 'dark' ||
                    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) root.classList.add('dark');
                } catch (e) {}
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
        <SwRegistrar />
      </body>
    </html>
  )
}
