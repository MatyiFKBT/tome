// Theme demo option A — three preview cards.
// Click any card → entire page retheme animates over ~0.3s.
import { useEffect, useState } from 'react'
import { readTheme, setTheme, subscribe, type Theme } from '../theme'

const THEMES: { id: Theme; label: string; sub: string }[] = [
  { id: 'light', label: 'Light',  sub: 'Crisp parchment whites' },
  { id: 'dark',  label: 'Dark',   sub: 'Easy on late nights'   },
  { id: 'amber', label: 'Amber',  sub: 'Warm cream + burnt orange' },
]

export function ThemePickerRow() {
  const [active, setActive] = useState<Theme>('light')
  useEffect(() => {
    setActive(readTheme())
    return subscribe(setActive)
  }, [])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {THEMES.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            onClick={(e) => setTheme(t.id, e.clientX, e.clientY)}
            className="text-left rounded-xl overflow-hidden transition-all"
            style={{
              border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
              background: 'var(--card)',
              boxShadow: isActive ? '0 0 0 4px var(--accent-soft)' : 'none',
            }}
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={`/shots/${t.id}/dashboard.png`}
                alt={`${t.label} theme preview`}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-[11px] text-[var(--muted)]">{t.sub}</div>
              </div>
              {isActive && (
                <span
                  className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  active
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
