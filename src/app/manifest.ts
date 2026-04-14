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
    background_color: '#f4ecd8',
    theme_color: '#f4ecd8',
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
    ],
  }
}
