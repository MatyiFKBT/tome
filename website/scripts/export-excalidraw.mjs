/**
 * Export an .excalidraw file to SVG via Playwright + @excalidraw/utils in browser context
 *
 * Usage: node scripts/export-excalidraw.mjs <input.excalidraw> <output.svg>
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const [,, inputPath, outputPath] = process.argv
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/export-excalidraw.mjs <input.excalidraw> <output.svg>')
  process.exit(1)
}

const scene = JSON.parse(readFileSync(resolve(inputPath), 'utf-8'))

const browser = await chromium.launch()
const page = await browser.newPage()

// Minimal HTML page that loads @excalidraw/utils from CDN in browser context
await page.setContent(`
  <html><body>
    <script type="module">
      import { exportToSvg } from "https://esm.sh/@excalidraw/utils@0.1.3-test32";
      window._exportToSvg = exportToSvg;
      window._ready = true;
    </script>
  </body></html>
`)

// Wait for the module to load
await page.waitForFunction(() => window._ready, null, { timeout: 15000 })

// Run the export in browser context
const svgString = await page.evaluate(async (sceneData) => {
  const svg = await window._exportToSvg({
    elements: sceneData.elements,
    appState: {
      exportWithDarkMode: true,
      viewBackgroundColor: '#1e1e1e',
      exportBackground: true,
    },
    files: null,
  })
  return new XMLSerializer().serializeToString(svg)
}, scene)

writeFileSync(resolve(outputPath), svgString)
console.log(`Exported to ${outputPath}`)

await browser.close()
