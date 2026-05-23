// #5 — Side-by-side flip between competitor "table view" and Tome "series view".
import { useState } from 'react'

export function ComparisonFlip() {
  const [side, setSide] = useState<'them' | 'tome'>('them')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1 bg-[var(--bg)] p-1 rounded-full border border-[var(--border)] w-fit mx-auto">
        <button
          onClick={() => setSide('them')}
          className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            background: side === 'them' ? 'var(--card)' : 'transparent',
            color: side === 'them' ? 'var(--fg)' : 'var(--muted)',
            boxShadow: side === 'them' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >Generic library app</button>
        <button
          onClick={() => setSide('tome')}
          className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            background: side === 'tome' ? 'var(--accent)' : 'transparent',
            color: side === 'tome' ? 'var(--accent-fg)' : 'var(--muted)',
          }}
        >Tome</button>
      </div>
      <div className="relative" style={{ perspective: 1200 }}>
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 700ms cubic-bezier(0.65, 0, 0.35, 1)',
            transform: side === 'tome' ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: 280,
          }}
        >
          {/* Front: boring table */}
          <div className="p-4" style={{ backfaceVisibility: 'hidden' }}>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-3">Books — series</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th className="text-left py-1.5">Title</th>
                  <th className="text-left">Author</th>
                  <th className="text-left">Series</th>
                  <th className="text-right">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/50">
                {['Berserk Vol 1', 'Berserk Vol 2', 'Berserk Vol 3', 'Berserk Vol 4', 'Berserk Vol 5', 'Berserk Vol 6'].map(t => (
                  <tr key={t}>
                    <td className="py-1.5">{t}</td>
                    <td>Kentaro Miura</td>
                    <td>Berserk</td>
                    <td className="text-right text-[var(--muted)]">1990</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Back: tome view */}
          <div
            className="absolute inset-0 p-4"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-3">Berserk · 10 volumes · ongoing</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>Black Swordsman · vols 1–3</div>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {[1, 2, 3].map(v => (
                <div key={v} className="aspect-[3/4] rounded text-white text-[9px] font-bold flex flex-col items-center justify-end p-1.5" style={{ background: '#1a1a2e' }}>
                  <div>v{v}</div>
                </div>
              ))}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>Golden Age · vols 3–14</div>
            <div className="grid grid-cols-6 gap-2">
              {[4, 5, 6, 7, 8, 9].map(v => (
                <div key={v} className="aspect-[3/4] rounded text-white text-[9px] font-bold flex flex-col items-center justify-end p-1.5" style={{ background: '#1a1a2e' }}>
                  <div>v{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
