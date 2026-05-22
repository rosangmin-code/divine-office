import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Цагийн Залбирал | Католик Шашны Өдөр Тутмын Залбирал',
    short_name: 'Цагийн Залбирал',
    description: 'Монгол дахь Католик итгэгчдэд зориулсан цагийн залбирлын апп',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf9f5',
    theme_color: '#faf9f5',
    lang: 'mn',
    dir: 'ltr',
    categories: ['lifestyle', 'education', 'books'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
