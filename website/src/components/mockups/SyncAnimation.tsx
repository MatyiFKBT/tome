// #1 — Bidirectional sync animation between KOReader and browser.
import { useEffect, useState } from 'react'

type Device = 'kobo' | 'web'
const PAGES = [47, 48, 49, 50, 51, 52]

export function SyncAnimation() {
  const [src, setSrc] = useState<Device>('kobo')
  const [pageIdx, setPageIdx] = useState(0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 600)
      setSrc(s => (s === 'kobo' ? 'web' : 'kobo'))
      setPageIdx(i => (i + 1) % PAGES.length)
    }, 2800)
    return () => clearInterval(t)
  }, [])

  const page = PAGES[pageIdx]

  return (
    <div className="flex items-center justify-center gap-6 flex-wrap py-6">
      <Device
        label="📱 KOReader"
        page={page}
        active={src === 'kobo'}
        pulse={pulse}
      />
      <div className="flex flex-col items-center justify-center min-w-[140px]" style={{ minHeight: 140 }}>
        <div className="text-xs text-[var(--muted)] mb-2">syncs page</div>
        <div className="relative h-px w-full bg-[var(--border)]">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
            style={{
              background: 'var(--accent)',
              left: src === 'kobo' ? '90%' : '10%',
              transition: 'left 1.5s cubic-bezier(0.65, 0, 0.35, 1)',
              boxShadow: pulse ? '0 0 0 6px var(--accent-soft)' : 'none',
            }}
          />
        </div>
        <div className="mt-2 text-[11px] tabular-nums text-[var(--muted)]">
          page {page}
        </div>
      </div>
      <Device
        label="💻 Web reader"
        page={page}
        active={src === 'web'}
        pulse={pulse}
      />
    </div>
  )
}

function Device({ label, page, active, pulse }: { label: string; page: number; active: boolean; pulse: boolean }) {
  return (
    <div
      className="rounded-2xl p-4 w-44 text-center transition-all"
      style={{
        background: 'var(--card)',
        border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: active && pulse ? '0 0 0 6px var(--accent-soft)' : 'none',
        transform: active ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <div className="text-xs font-semibold mb-3 text-[var(--muted)]">{label}</div>
      <div className="aspect-[3/4] rounded-md flex flex-col p-3 mb-2" style={{ background: 'var(--bg)' }}>
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">Berserk · v07</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[10px] leading-relaxed text-[var(--fg)]/70 px-1">
            …the Black<br />Swordsman raised<br />his blade…
          </div>
        </div>
        <div className="flex justify-between items-baseline">
          <div className="text-[10px] text-[var(--muted)]">p.</div>
          <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{page}</div>
        </div>
      </div>
      <div className="text-[10px] text-[var(--muted)]">
        {active ? 'just turned the page' : 'syncing…'}
      </div>
    </div>
  )
}
