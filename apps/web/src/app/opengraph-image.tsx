import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'RecoverHub — Recover Failed Payments. Keep Your SaaS Alive.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0B0F1E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(239,67,67,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ef4343',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ↻
          </div>
          <span style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700 }}>
            RecoverHub
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '64px',
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}
        >
          Stop Losing Revenue
          <br />
          <span style={{ color: '#ef4343' }}>to Failed Payments</span>
        </div>

        {/* Subtext */}
        <div
          style={{
            color: '#8892A7',
            fontSize: '24px',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Stripe-native auto-retry + smart dunning emails.
          <br />
          Simpler and cheaper than Churnkey or Baremetrics.
        </div>

        {/* Badge */}
        <div
          style={{
            marginTop: '40px',
            padding: '10px 24px',
            borderRadius: '9999px',
            border: '1px solid rgba(239,67,67,0.4)',
            background: 'rgba(239,67,67,0.1)',
            color: '#ef4343',
            fontSize: '18px',
            fontWeight: 600,
          }}
        >
          Free plan available · Connect in 5 minutes
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
