// Framework-agnostic floating tooltip for SVG / DOM charts.
//
// Reuse: call attachChartTooltip(rootEl) once. It event-delegates over any
// descendant carrying a `data-tip` attribute, shows a styled box that follows
// the cursor, and flips near the viewport edges. Returns a cleanup function.
//
// Portable to the React app (frontend/) — drop this file into src/lib and:
//   useEffect(() => attachChartTooltip(ref.current!), [])
// No dependencies, no framework assumptions; styles itself from CSS theme
// variables (--card / --border / --fg) so it matches whatever app hosts it.

export function attachChartTooltip(root: HTMLElement | null): () => void {
  if (!root || typeof document === 'undefined') return () => {}

  const tip = document.createElement('div')
  tip.setAttribute('role', 'tooltip')
  Object.assign(tip.style, {
    position: 'fixed',
    zIndex: '50',
    pointerEvents: 'none',
    opacity: '0',
    transform: 'translateY(2px)',
    transition: 'opacity 90ms ease, transform 90ms ease',
    padding: '6px 9px',
    borderRadius: '8px',
    font: '500 12px/1.3 ui-sans-serif, system-ui, sans-serif',
    whiteSpace: 'nowrap',
    color: 'var(--fg, #111)',
    background: 'var(--card, #fff)',
    border: '1px solid var(--border, #ddd)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
  } as CSSStyleDeclaration)
  document.body.appendChild(tip)

  let active: Element | null = null

  const place = (e: MouseEvent) => {
    const pad = 14
    const r = tip.getBoundingClientRect()
    let x = e.clientX + pad
    let y = e.clientY + pad
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad
    tip.style.left = `${Math.max(8, x)}px`
    tip.style.top = `${Math.max(8, y)}px`
  }

  const onOver = (e: Event) => {
    const t = (e.target as Element).closest('[data-tip]')
    if (!t) return
    active = t
    tip.textContent = t.getAttribute('data-tip') || ''
    tip.style.opacity = '1'
    tip.style.transform = 'translateY(0)'
    place(e as MouseEvent)
  }
  const onMove = (e: Event) => {
    if (active) place(e as MouseEvent)
  }
  const onOut = (e: Event) => {
    const t = (e.target as Element).closest('[data-tip]')
    if (t && t === active) {
      active = null
      tip.style.opacity = '0'
      tip.style.transform = 'translateY(2px)'
    }
  }

  root.addEventListener('mouseover', onOver)
  root.addEventListener('mousemove', onMove)
  root.addEventListener('mouseout', onOut)

  return () => {
    root.removeEventListener('mouseover', onOver)
    root.removeEventListener('mousemove', onMove)
    root.removeEventListener('mouseout', onOut)
    tip.remove()
  }
}
