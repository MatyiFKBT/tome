// #6 — SVG e-reader with a page-turn animation. Charm.
import { useEffect, useState } from 'react'

const PAGES = [
  ['Chapter 1', 'It was the best of times,', 'it was the worst of times,', 'it was the age of wisdom,'],
  ['', 'it was the age of foolishness,', 'it was the epoch of belief,', 'it was the epoch of incredulity,'],
  ['', 'it was the season of Light,', 'it was the season of Darkness,', 'it was the spring of hope,'],
  ['', 'it was the winter of despair,', 'we had everything before us,', 'we had nothing before us…'],
]

export function PixelEReader() {
  const [page, setPage] = useState(0)
  const [turning, setTurning] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setTurning(true)
      setTimeout(() => {
        setPage(p => (p + 1) % PAGES.length)
        setTurning(false)
      }, 450)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const text = PAGES[page]

  return (
    <div className="flex justify-center py-8">
      <div className="relative" style={{ width: 200, height: 280 }}>
        {/* Device shell */}
        <div
          className="absolute inset-0 rounded-[24px]"
          style={{ background: 'var(--fg)', opacity: 0.15 }}
        />
        <div
          className="absolute inset-0 rounded-[24px]"
          style={{
            background: 'color-mix(in oklab, var(--fg), transparent 90%)',
            border: '2px solid color-mix(in oklab, var(--fg), transparent 70%)',
            margin: 0,
          }}
        />
        {/* Screen */}
        <div
          className="absolute rounded-md overflow-hidden flex flex-col p-3"
          style={{
            inset: '16px 12px 30px 12px',
            background: 'color-mix(in oklab, var(--bg), white 6%)',
            fontFamily: 'Georgia, serif',
          }}
        >
          <div
            className="flex-1 transition-all"
            style={{
              opacity: turning ? 0 : 1,
              transform: turning ? 'translateY(-8px)' : 'translateY(0)',
              transition: 'opacity 220ms, transform 220ms',
              color: 'var(--fg)',
            }}
          >
            {text.map((line, i) => (
              <div key={i} className={i === 0 ? 'text-[10px] font-bold uppercase tracking-widest mb-2' : 'text-[10px] leading-relaxed mb-1'}>{line}</div>
            ))}
          </div>
          <div className="text-[9px] text-[var(--muted)] text-right tabular-nums">{page + 1} / {PAGES.length}</div>
        </div>
        {/* Home button */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: 8,
            width: 14,
            height: 14,
            background: 'color-mix(in oklab, var(--fg), transparent 70%)',
          }}
        />
      </div>
    </div>
  )
}
