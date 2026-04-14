import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2b1f14',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#c9a961',
          fontSize: 140,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ✝
      </div>
    ),
    size,
  )
}
