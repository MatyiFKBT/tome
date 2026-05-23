// #4 — Cmd+K search modal that types itself and reveals results.
import { useEffect, useState } from 'react'

const QUERY = 'bersk'  // intentionally fuzzy
const RESULTS = [
  { title: 'Berserk, Vol. 1', sub: 'series · Kentaro Miura' },
  { title: 'Berserk, Vol. 7', sub: 'series · currently reading 73%' },
  { title: 'Berserk arcs', sub: 'admin · Black Swordsman, Golden Age…' },
  { title: 'Series — Berserk', sub: 'page · 10 volumes' },
]

export function CommandKDemo() {
  const [typed, setTyped] = useState('')
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loop = async () => {
      while (!cancelled) {
        setTyped('')
        setShowResults(false)
        await new Promise(r => setTimeout(r, 700))
        for (let i = 1; i <= QUERY.length; i++) {
          if (cancelled) return
          setTyped(QUERY.slice(0, i))
          await new Promise(r => setTimeout(r, 120 + Math.random() * 60))
        }
        if (cancelled) return
        await new Promise(r => setTimeout(r, 250))
        setShowResults(true)
        await new Promise(r => setTimeout(r, 2800))
      }
    }
    loop()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-lg mx-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          readOnly
          value={typed}
          placeholder="Search your library…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ caretColor: 'var(--accent)' }}
        />
        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">⌘K</kbd>
      </div>
      <div style={{ maxHeight: showResults ? 240 : 0, overflow: 'hidden', transition: 'max-height 360ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {RESULTS.map((r, i) => (
          <div
            key={i}
            className="px-4 py-2.5 flex items-baseline justify-between border-t border-[var(--border)]/50 hover:bg-[var(--accent-soft)] transition-colors"
            style={{
              opacity: showResults ? 1 : 0,
              transform: showResults ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 300ms ${i * 60}ms, transform 300ms ${i * 60}ms`,
            }}
          >
            <div>
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-[11px] text-[var(--muted)]">{r.sub}</div>
            </div>
            {i === 0 && <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">↵</kbd>}
          </div>
        ))}
      </div>
      <div className="px-4 py-2 text-[10px] text-[var(--muted)] border-t border-[var(--border)] flex justify-between">
        <span>↑↓ navigate</span>
        <span>{showResults ? `${RESULTS.length} results` : 'type to search'}</span>
      </div>
    </div>
  )
}
