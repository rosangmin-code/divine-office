import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          fontSize: 26,
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
