// #10 — Animated KOReader wrench menu where TomeSync gets installed.
import { useEffect, useState } from 'react'

type Stage = 'before' | 'installing' | 'done'

const MENU_BEFORE = ['Search', 'Bookmarks', 'Statistics', 'Profile', 'Cloud storage']
const MENU_DONE   = ['Search', 'Bookmarks', 'Statistics', 'Profile', 'Cloud storage', 'TomeSync']

export function PluginInstallFlow() {
  const [stage, setStage] = useState<Stage>('done') // SSR: final

  useEffect(() => {
    let cancelled = false
    const cycle = async () => {
      while (!cancelled) {
        setStage('before')
        await new Promise(r => setTimeout(r, 1400))
        if (cancelled) return
        setStage('installing')
        await new Promise(r => setTimeout(r, 1100))
        if (cancelled) return
        setStage('done')
        await new Promise(r => setTimeout(r, 2400))
      }
    }
    cycle()
    return () => { cancelled = true }
  }, [])

  const menu = stage === 'before' ? MENU_BEFORE : MENU_DONE
  const showCheck = stage === 'done'
  const showSpinner = stage === 'installing'

  return (
    <div className="flex justify-center py-2">
      <div
        className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden w-72"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
      >
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] flex items-center gap-2">
          <span>🔧</span> KOReader · wrench menu
          {showSpinner && (
            <span className="ml-auto text-[10px] text-[var(--accent)]">installing tomesync.koplugin…</span>
          )}
        </div>
        <div>
          {menu.map((item, i) => {
            const isNew = item === 'TomeSync'
            return (
              <div
                key={item}
                className="px-3 py-2 text-xs border-t border-[var(--border)]/40 first:border-0 flex items-center justify-between"
                style={{
                  background: isNew && showCheck ? 'var(--accent-soft)' : 'transparent',
                  color: isNew && showCheck ? 'var(--accent)' : 'var(--fg)',
                  fontWeight: isNew && showCheck ? 600 : 400,
                  opacity: isNew && stage === 'before' ? 0 : 1,
                  transform: isNew && showCheck ? 'translateX(0)' : isNew ? 'translateX(-8px)' : 'translateX(0)',
                  transition: 'opacity 320ms, transform 320ms, background 280ms, color 280ms',
                }}
              >
                <span>{item}</span>
                {isNew && showCheck && <span style={{ color: 'var(--accent)' }}>✓ installed</span>}
              </div>
            )
          })}
        </div>
        <div className="px-3 py-2 text-[10px] text-[var(--muted)] border-t border-[var(--border)]">
          {stage === 'before' && 'drag the .koplugin into KOReader/plugins/'}
          {stage === 'installing' && 'restart KOReader…'}
          {stage === 'done' && 'plugin is live — your reading is now tracked'}
        </div>
      </div>
    </div>
  )
}
