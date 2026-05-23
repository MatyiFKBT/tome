// Auto-cycling dashboard preview. Defaults to bare-image mode (for use in
// hero wrappers that already have their own card frame). Pass `showDots`
// to render the theme indicator row underneath (mockup-evaluation use).
import { useEffect, useState } from 'react'

const THEMES = ['light', 'dark', 'amber'] as const
type Variant = typeof THEMES[number]

const LABELS: Record<Variant, string> = {
  light: 'Light',
  dark:  'Dark',
  amber: 'Amber',
}

interface Props {
  showDots?: boolean
}

export function AutoCycleTheme({ showDots = false }: Props) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % THEMES.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <div className="relative w-full" style={{ aspectRatio: '16 / 10' }}>
        {THEMES.map((t, idx) => (
          <img
            key={t}
            src={`/shots/${t}/dashboard.png`}
            alt={`${LABELS[t]} theme dashboard`}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{
              opacity: idx === i ? 1 : 0,
              transition: 'opacity 800ms ease-in-out',
            }}
          />
        ))}
      </div>
      {showDots && (
        <div className="flex items-center justify-center gap-3 py-3 bg-[var(--card)] border-t border-[var(--border)]">
          {THEMES.map((t, idx) => (
            <button
              key={t}
              onClick={() => setI(idx)}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: idx === i ? 'var(--accent)' : 'var(--muted)' }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: idx === i ? 'var(--accent)' : 'var(--border)',
                  transition: 'background 200ms',
                }}
              />
              {LABELS[t]}
            </button>
          ))}
          <span className="text-[10px] text-[var(--muted)] ml-2">cycles every 4s</span>
        </div>
      )}
    </>
  )
}
