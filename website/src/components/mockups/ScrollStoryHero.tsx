// Hero option B — Scroll-driven storytelling.
// Visible-first: SSR shows the full chain at opacity 1 so the mockup reads
// correctly without JS. With JS, hydrate to opacity 0 + reveal-on-scroll for
// the marketing motion.
import { useEffect, useRef, useState } from 'react'

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hydrated, setHydrated] = useState(false)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    setHydrated(true)
    if (!ref.current) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setShown(true), delay)
        io.disconnect()
      }
    }, { threshold: 0.2 })
    io.observe(ref.current)
    // If already in view on hydrate (above-the-fold), trigger immediately
    const rect = ref.current.getBoundingClientRect()
    if (rect.top < window.innerHeight) setTimeout(() => setShown(true), delay)
    return () => io.disconnect()
  }, [delay])
  // SSR / no-JS: visible. Post-hydration: animate in.
  const hidden = hydrated && !shown
  return (
    <div
      ref={ref}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(24px)' : 'translateY(0)',
        transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>
  )
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-4 gap-3 text-[var(--muted)] text-xs">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span>↓ {label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  )
}

function MockBox({ title, body, tone = 'plain' }: { title: string; body: string; tone?: 'plain' | 'accent' }) {
  const accent = tone === 'accent'
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--card)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
        color: 'var(--fg)',
      }}
    >
      <div className="text-sm font-semibold mb-1" style={{ color: accent ? 'var(--accent)' : 'var(--fg)' }}>{title}</div>
      <div className="text-xs text-[var(--muted)]">{body}</div>
    </div>
  )
}

export function ScrollStoryHero() {
  return (
    <div className="space-y-2">
      <Reveal>
        <MockBox title="📚 Your library lives on your server" body="EPUBs, manga, PDFs. Tags, series, arcs. Browseable on any device." />
      </Reveal>
      <Connector label="syncs to" />
      <Reveal delay={100}>
        <MockBox title="📖 KOReader on your e-reader" body="Drop in the pre-baked plugin. Read offline. Sessions queue locally." tone="accent" />
      </Reveal>
      <Connector label="every page turn" />
      <Reveal delay={150}>
        <MockBox title="⏱ Tome records every minute" body="Start time, end time, pages turned, device. Bidirectional position sync." />
      </Reveal>
      <Connector label="becomes" />
      <Reveal delay={200}>
        <MockBox title="📊 Stats that get sharper the more you read" body="Streaks, heatmaps, completion estimates. Real data, not file metadata." tone="accent" />
      </Reveal>
    </div>
  )
}
