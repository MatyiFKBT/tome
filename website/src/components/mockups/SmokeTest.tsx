// Dead-simple React component — no hooks, no effects, no imports.
// If THIS doesn't render either, the issue is Astro/Vite, not my code.
export function SmokeTest() {
  return (
    <div style={{
      padding: 24,
      background: '#22c55e',
      color: 'white',
      borderRadius: 12,
      fontSize: 18,
      fontWeight: 700,
      textAlign: 'center',
    }}>
      ✓ React component rendered successfully
    </div>
  )
}
