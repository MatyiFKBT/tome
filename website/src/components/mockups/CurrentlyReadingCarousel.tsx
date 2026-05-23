// #3 — Currently-reading carousel with more realistic synthetic covers.
import { useEffect, useState } from 'react'

interface Book {
  title: string
  author: string
  progress: number
  device: string
  // Visual style for the synthetic cover
  bg: string  // CSS gradient
  fg: string  // text colour
  font?: string
}

const BOOKS: Book[] = [
  {
    title: 'Berserk, Vol. 7',
    author: 'Kentaro Miura',
    progress: 73,
    device: 'KOReader · Kobo Libra',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #2a1a2a 100%)',
    fg: '#e8d9b8',
    font: 'serif',
  },
  {
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    progress: 42,
    device: 'Web reader',
    bg: 'linear-gradient(135deg, #1e3a5f 0%, #0a1626 100%)',
    fg: '#f5d76e',
    font: 'sans-serif',
  },
  {
    title: 'Frankenstein',
    author: 'Mary Shelley',
    progress: 18,
    device: 'KOReader · Kindle',
    bg: 'linear-gradient(160deg, #2d3e2b 0%, #1a2418 100%)',
    fg: '#d4c5a0',
    font: 'serif',
  },
  {
    title: 'Dungeon Mauling',
    author: 'Eric Ugland',
    progress: 67,
    device: 'Web reader',
    bg: 'linear-gradient(135deg, #4a2c5e 0%, #1c0e2e 100%)',
    fg: '#e8d4b8',
    font: 'sans-serif',
  },
]

function Cover({ book }: { book: Book }) {
  return (
    <div
      className="shrink-0 rounded-md overflow-hidden flex flex-col justify-between p-3 relative"
      style={{
        width: 84,
        height: 116,
        background: book.bg,
        color: book.fg,
        fontFamily: book.font,
        boxShadow: '0 8px 16px -8px rgba(0,0,0,0.3), inset -6px 0 8px -6px rgba(0,0,0,0.5)',
      }}
    >
      {/* Spine */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      />
      <div className="flex flex-col gap-1 mt-1 pl-1">
        <div className="h-px w-8" style={{ background: book.fg, opacity: 0.5 }} />
        <div className="h-px w-6" style={{ background: book.fg, opacity: 0.3 }} />
      </div>
      <div className="pl-1">
        <div className="text-[11px] font-bold leading-tight mb-1">{book.title}</div>
        <div className="text-[9px] opacity-80" style={{ fontStyle: 'italic' }}>{book.author}</div>
      </div>
    </div>
  )
}

export function CurrentlyReadingCarousel() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % BOOKS.length), 3600)
    return () => clearInterval(t)
  }, [])

  const b = BOOKS[i]
  return (
    <div className="max-w-md mx-auto p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-4">Currently reading</div>
      <div className="flex items-stretch gap-4" key={i} style={{ animation: 'crFade 400ms ease-out' }}>
        <Cover book={b} />
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="text-sm font-semibold truncate">{b.title}</div>
            <div className="text-xs text-[var(--muted)] mb-3">{b.author}</div>
            <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${b.progress}%`,
                  background: 'var(--accent)',
                  transition: 'width 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
            <div className="text-[10px] text-[var(--muted)] mt-1 tabular-nums">{b.progress}% complete</div>
          </div>
          <div className="text-[10px] text-[var(--muted)] mt-2">last read on {b.device}</div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-5">
        {BOOKS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className="rounded-full transition-all"
            style={{
              width: idx === i ? 18 : 6,
              height: 6,
              background: idx === i ? 'var(--accent)' : 'var(--border)',
              transition: 'all 280ms',
            }}
            aria-label={`Show book ${idx + 1}`}
          />
        ))}
      </div>
      <style>{`@keyframes crFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
