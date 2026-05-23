// Hero option C — Subtle enhancements on top of the existing static cards:
//   - count-up on numbers when card enters viewport
//   - hover parallax tilt
// Visible-first: SSR shows the final values. Animation is post-hydration polish.
import { useEffect, useRef, useState } from 'react'

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(to)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    if (!ref.current) return
    setN(0)
    const animate = () => {
      let raf = 0
      const start = performance.now()
      const dur = 2200
      const tick = (t: number) => {
        const elapsed = t - start
        const pct = Math.min(1, elapsed / dur)
        const eased = 1 - Math.pow(1 - pct, 3)
        setN(Math.round(to * eased))
        if (pct < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }
    const rect = ref.current.getBoundingClientRect()
    if (rect.top < window.innerHeight) return animate()
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { animate(); io.disconnect() }
    }, { threshold: 0.4 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{(mounted ? n : to).toLocaleString()}{suffix}</span>
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect()
    if (!r || !ref.current) return
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.transform = `perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg) translateY(-2px)`
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = ''
  }
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
      style={{ transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {children}
    </div>
  )
}

export function CountUpHero() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <TiltCard>
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Books in library</div>
        <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
          <CountUp to={312} />
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">across 18 series</div>
      </TiltCard>
      <TiltCard>
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Reading streak</div>
        <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
          <CountUp to={47} suffix="d" />
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">longest yet</div>
      </TiltCard>
      <TiltCard>
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Sessions tracked</div>
        <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
          <CountUp to={1688} />
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">via KOReader + web</div>
      </TiltCard>
    </div>
  )
}
