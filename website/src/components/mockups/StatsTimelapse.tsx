// #7 — Stats time-lapse. Bar chart grows over 12 months once, on first view.
import { useEffect, useRef, useState } from 'react'

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
const HOURS  = [4, 8, 12, 9, 14, 11, 16, 22, 19, 24, 29, 38]
const STREAK = [3, 8, 14, 12, 18, 22, 31, 28, 34, 41, 47, 47]

export function StatsTimelapse() {
  const ref = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(MONTHS.length)   // SSR: fully grown
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated) {
        setAnimated(true)
        setStep(0)
        let i = 1
        const tick = () => {
          setStep(i)
          i++
          if (i <= MONTHS.length) setTimeout(tick, 380)
        }
        setTimeout(tick, 200)
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [animated])

  const max = Math.max(...HOURS)
  const currentStreak = step > 0 ? STREAK[step - 1] : 0
  const currentMonth = step > 0 ? MONTHS[step - 1] : '—'
  const totalHours = HOURS.slice(0, step).reduce((a, b) => a + b, 0)

  return (
    <div ref={ref} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">12 months · so far</div>
          <div className="text-xl font-semibold tabular-nums mt-0.5">
            {totalHours}<span className="text-sm font-normal text-[var(--muted)]">h read</span>
            <span className="text-xs font-normal text-[var(--muted)] ml-2">· through {currentMonth}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Streak</div>
          <div className="text-3xl font-bold tabular-nums leading-none mt-0.5" style={{ color: 'var(--accent)' }}>{currentStreak}d</div>
        </div>
      </div>
      <div className="flex items-end gap-2 h-32 px-1">
        {MONTHS.map((m, i) => {
          const visible = i < step
          const h = visible ? (HOURS[i] / max) * 100 : 4
          const isCurrent = i === step - 1
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex-1 flex items-end w-full">
                <div
                  className="w-full rounded-t-md relative"
                  style={{
                    height: `${h}%`,
                    minHeight: 4,
                    background: 'var(--accent)',
                    opacity: visible ? (isCurrent ? 1 : 0.75) : 0.15,
                    transition: 'height 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 360ms',
                  }}
                >
                  {isCurrent && (
                    <div
                      className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      {HOURS[i]}h
                    </div>
                  )}
                </div>
              </div>
              <div
                className="text-[10px] transition-colors"
                style={{ color: visible ? 'var(--fg)' : 'var(--muted)', fontWeight: isCurrent ? 600 : 400 }}
              >{m}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
