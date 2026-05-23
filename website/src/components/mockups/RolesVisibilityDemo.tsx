// #9 — Interactive roles/visibility demo. Toggle role → filtered book list.
import { useState } from 'react'

type Role = 'admin' | 'member' | 'guest'

interface Book { title: string; ownedBy: 'admin' | 'member' | 'public'; library: string }

const BOOKS: Book[] = [
  { title: 'Berserk, Vol. 1',         ownedBy: 'admin',  library: 'Manga' },
  { title: 'Frankenstein',            ownedBy: 'admin',  library: 'Classics' },
  { title: 'Project Hail Mary',       ownedBy: 'member', library: 'My sci-fi' },
  { title: "Stefan's secret diary",   ownedBy: 'member', library: 'Private' },
  { title: 'The Three-Body Problem',  ownedBy: 'admin',  library: 'Sci-Fi' },
  { title: "Family album '24",        ownedBy: 'admin',  library: 'Public — Kids' },
]

function canSee(role: Role, book: Book): boolean {
  if (role === 'admin') return true
  if (role === 'member') return book.ownedBy === 'admin' || book.library === 'My sci-fi'
  return book.ownedBy === 'admin' && book.library !== 'Private' && book.library !== 'Sci-Fi'
}

export function RolesVisibilityDemo() {
  const [role, setRole] = useState<Role>('admin')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-[var(--muted)]">You are:</span>
        {(['admin', 'member', 'guest'] as Role[]).map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className="px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
            style={{
              background: role === r ? 'var(--accent)' : 'var(--card)',
              color: role === r ? 'var(--accent-fg)' : 'var(--fg)',
              border: `1px solid ${role === r ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >{r}</button>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
        {BOOKS.map(b => {
          const visible = canSee(role, b)
          return (
            <div
              key={b.title}
              className="px-4 py-3 flex items-center justify-between"
              style={{
                opacity: visible ? 1 : 0.25,
                background: visible ? 'transparent' : 'color-mix(in oklab, var(--border), transparent 70%)',
                transition: 'opacity 280ms, background 280ms',
              }}
            >
              <div>
                <div className="text-sm font-medium">{b.title}</div>
                <div className="text-[11px] text-[var(--muted)]">{b.library} · uploaded by {b.ownedBy}</div>
              </div>
              <div className="text-[11px]" style={{ color: visible ? 'var(--accent)' : 'var(--muted)' }}>
                {visible ? '✓ visible' : '— hidden'}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-[var(--muted)] text-center">
        Try the role toggles — visibility is enforced server-side, not just in the UI.
      </p>
    </div>
  )
}
