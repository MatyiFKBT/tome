// One-off: re-renders the PWA install icons from the brand app-icon-paper.svg
// at 192/512 sizes. Paper tile (light bg + ink mark) reads on both light and
// dark browser sidebar surfaces — the original ink tile blended into dark.
import { chromium } from 'playwright'
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const svgPath = process.argv[2] || '/tmp/tome-brand/svg/app-icon-paper.svg'
const svg = readFileSync(svgPath, 'utf-8')

const outDir = resolve(process.cwd(), '../frontend/public')

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-512x512-maskable.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 192 },
]

const browser = await chromium.launch()
for (const { name, size } of sizes) {
  const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.setContent(`<!doctype html><html><head><style>
    html,body { margin:0; padding:0; width:${size}px; height:${size}px; background:transparent }
    svg { display:block; width:${size}px; height:${size}px }
  </style></head><body>${svg}</body></html>`)
  await page.waitForTimeout(150)
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  writeFileSync(join(outDir, name), png)
  console.log(`OK ${name} ${size}x${size}`)
  await ctx.close()
}
await browser.close()
