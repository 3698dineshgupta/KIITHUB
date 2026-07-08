import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 96,
              height: 96,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: 56,
              fontWeight: 800,
            }}
          >
            K
          </div>
          <div style={{ color: 'white', fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>
            KIIT Hub
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 32, fontWeight: 500 }}>
          Notes, PYQs, Merchandise &amp; more for KIIT students
        </div>
      </div>
    ),
    { ...size }
  )
}
