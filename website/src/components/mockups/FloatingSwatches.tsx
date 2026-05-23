// Theme demo option B — small floating swatches. Less footprint.
// Three coloured pills bottom-right; click to retheme.
import { useEffect, useState } from 'react'
import { readTheme, setTheme, subscribe, type Theme } from '../theme'

const THEMES: { id: Theme; label: string; bg: string; fg: string }[] = [
  { id: 'light', label: 'Light',  bg: '#ffffff', fg: '#1a1a1a' },
  { id: 'dark',  label: 'Dark',   bg: '#0a0a0a', fg: '#fafafa' },
  { id: 'amber', label: 'Amber',  bg: '#f4ead7', fg: '#7a3e0e' },
]

export function FloatingSwatches() {
  const [active, setActive] = useState<Theme>('light')
  useEffect(() => {
    setActive(readTheme())
    return subscribe(setActive)
  }, [])
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-md">
      <span className="text-[11px] text-[var(--muted)] pr-1">🎨 Try a theme:</span>
      {THEMES.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            onClick={(e) => setTheme(t.id, e.clientX, e.clientY)}
            title={t.label}
            aria-label={`Switch to ${t.label} theme`}
            className="rounded-full transition-all"
            style={{
              width: 22,
              height: 22,
              background: t.bg,
              border: `2px solid ${t.fg}`,
              outline: isActive ? `2px solid var(--accent)` : 'none',
              outlineOffset: 2,
              transform: isActive ? 'scale(1.12)' : 'scale(1)',
            }}
          />
        )
      })}
    </div>
  )
}
