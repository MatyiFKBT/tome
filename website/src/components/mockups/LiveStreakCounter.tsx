// #8 — Live streak counter that pulses and occasionally ticks up.
import { useEffect, useState } from 'react'

export function LiveStreakCounter() {
  const [streak, setStreak] = useState(47)
  const [pulse, setPulse] = useState(false)
  const [bumped, setBumped] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loop = async () => {
      while (!cancelled) {
        // Pulse every ~3s
        setPulse(true)
        await new Promise(r => setTimeout(r, 600))
        setPulse(false)
        await new Promise(r => setTimeout(r, 2200))
        // Occasionally bump the streak (every 3rd pulse)
        if (!cancelled && Math.random() > 0.6) {
          setBumped(true)
          setStreak(s => s + 1)
          await new Promise(r => setTimeout(r, 1800))
          setBumped(false)
          await new Promise(r => setTimeout(r, 600))
          setStreak(47)  // reset for loop
        }
      }
    }
    loop()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div
        className="inline-flex items-center gap-3 px-5 py-3 rounded-full"
        style={{
          background: 'var(--accent-soft)',
          border: `1px solid var(--accent)`,
          boxShadow: pulse ? `0 0 0 10px color-mix(in oklab, var(--accent), transparent 88%)` : 'none',
          transition: 'box-shadow 600ms, transform 240ms',
          transform: bumped ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        <span className="text-2xl">🔥</span>
        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{
              color: 'var(--accent)',
              transition: 'transform 300ms',
              display: 'inline-block',
              transform: bumped ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            {streak}
          </span>
          <span className="text-sm font-medium text-[var(--accent)]">day streak</span>
        </div>
      </div>
      <div className="text-xs text-[var(--muted)]">
        {bumped ? '↑ session just synced from your e-reader' : 'updates live as you read'}
      </div>
    </div>
  )
}
