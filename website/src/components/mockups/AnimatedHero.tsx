// Hero option A — "Live dashboard" with animated metrics.
// Initial state shows the FINAL values so the mockup reads correctly even
// before/without hydration. Animations are an enhancement, not a gate.
import { useEffect, useState } from 'react'

function CountUp({ to, suffix = '', duration = 2400, prefix = '' }: { to: number; suffix?: string; duration?: number; prefix?: string }) {
  // Start at `to` so SSR output is the final value. On client mount,
  // briefly reset to 0 and count back up — that gives the animation
  // without flashing zeros to no-JS users.
  const [n, setN] = useState(to)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    setN(0)
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const elapsed = t - start
      const pct = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - pct, 3)
      setN(Math.round(to * eased))
      if (pct < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  // After mount we want to keep the animated value;
  // before mount (SSR) we want the target.
  return <span>{prefix}{(mounted ? n : to).toLocaleString()}{suffix}</span>
}

function Bars() {
  // 21 days of synthetic reading minutes
  const data = [12, 28, 5, 0, 34, 18, 22, 41, 8, 15, 33, 27, 0, 19, 26, 38, 12, 0, 22, 45, 31]
  const max = Math.max(...data)
  const [drawn, setDrawn] = useState(true) // SSR: bars at full height
  useEffect(() => {
    setDrawn(false)
    const t = setTimeout(() => setDrawn(true), 80)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex items-end gap-[3px] h-12 w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: drawn ? `${(v / max) * 100}%` : '0%',
            minHeight: drawn && v > 0 ? '2px' : 0,
            background: 'var(--accent)',
            opacity: drawn ? 0.85 : 0,
            transition: `height 700ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 30}ms, opacity 400ms ${i * 30}ms`,
          }}
        />
      ))}
    </div>
  )
}

function Progress({ to, label, sub }: { to: number; label: string; sub: string }) {
  const [pct, setPct] = useState(to)
  useEffect(() => {
    setPct(0)
    const t = setTimeout(() => setPct(to), 250)
    return () => clearTimeout(t)
  }, [to])
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-[var(--muted)]">{sub}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'var(--accent)',
            transition: 'width 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  )
}

export function AnimatedHero() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Streak</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
            <CountUp to={47} suffix="d" />
          </div>
          <div className="text-[10px] text-[var(--muted)]">longest: 47d</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">This week</div>
          <div className="text-2xl font-bold tabular-nums">
            <CountUp to={3} />
            <span className="text-base font-medium">h </span>
            <CountUp to={22} duration={2800} />
            <span className="text-base font-medium">m</span>
          </div>
          <div className="text-[10px] text-[var(--muted)]">+18% vs last week</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Pages</div>
          <div className="text-2xl font-bold tabular-nums">
            <CountUp to={1547} duration={3200} />
          </div>
          <div className="text-[10px] text-[var(--muted)]">68 sessions</div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] p-4 mb-5 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Currently reading</div>
        <Progress to={67.4} label="Dungeon Mauling" sub="Eric Ugland · 67.4%" />
        <Progress to={42} label="Project Hail Mary" sub="Andy Weir · 42%" />
      </div>

      <div className="rounded-xl border border-[var(--border)] p-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-3">Reading time per day</div>
        <Bars />
        <div className="flex justify-between text-[9px] text-[var(--muted)] mt-1">
          <span>3 weeks ago</span>
          <span>today</span>
        </div>
      </div>
    </div>
  )
}
