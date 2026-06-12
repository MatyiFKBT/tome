// Record the stats-dashboard editing demo for all 3 themes against the
// showcase instance. Shows: enter Edit, drag a tile, resize one, flip a
// chart type in the config popover, add a widget from the gallery, Done.
//
// Usage:
//   scripts/run-showcase.sh           # in another terminal (or any stack
//                                     # reachable via TOME_SCREENSHOT_BASE)
//   node frontend/scripts/record-stats-demo.mjs
//
// Output: website/public/stats-edit-{light,dark,amber}.webm
import { chromium } from 'playwright'
import { rename, readdir, unlink } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.TOME_SCREENSHOT_BASE ?? 'http://localhost:5174'
const API = process.env.TOME_SCREENSHOT_API ?? 'http://localhost:8090'
const USER = 'benedict'
const PASS = 'showcase'

const __dir = path.dirname(new URL(import.meta.url).pathname)
const TMP_DIR = path.resolve(__dir, '../../docs/_statsdemotmp')
const OUT_DIR = path.resolve(__dir, '../../website/public')

const VIEWPORT = { width: 1400, height: 900 }
const THEMES = process.env.DEMO_THEMES?.split(',').map((s) => s.trim()) ?? ['light', 'dark', 'amber']

async function getToken() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  })
  const { access_token } = await res.json()
  return access_token
}

// The board is server-persisted — reset it so every take starts from the
// pristine default Overview board (same gotcha as the screenshot sweep).
async function resetBoard(token) {
  await fetch(`${API}/api/stats/dashboard`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: {} }),
  })
}

// Headless recordings have no pointer, which makes drags look like
// poltergeist activity — inject a fake cursor that follows mouse events.
const FAKE_CURSOR = () => {
  const dot = document.createElement('div')
  dot.id = '__democursor'
  Object.assign(dot.style, {
    position: 'fixed', zIndex: 99999, width: '14px', height: '14px',
    borderRadius: '50%', background: 'rgba(0,0,0,0.55)',
    border: '2px solid rgba(255,255,255,0.9)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)', pointerEvents: 'none',
    left: '-30px', top: '-30px', transition: 'transform 80ms ease',
  })
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(dot))
  window.addEventListener('mousemove', (e) => {
    dot.style.left = `${e.clientX - 7}px`
    dot.style.top = `${e.clientY - 7}px`
  }, true)
  window.addEventListener('mousedown', () => { dot.style.transform = 'scale(0.72)' }, true)
  window.addEventListener('mouseup', () => { dot.style.transform = 'scale(1)' }, true)
}

// Eased pointer glide so moves read as human, not teleporting.
async function glide(page, from, to, ms = 700) {
  const steps = Math.max(12, Math.round(ms / 16))
  for (let i = 1; i <= steps; i++) {
    const p = i / steps
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
    await page.mouse.move(from.x + (to.x - from.x) * ease, from.y + (to.y - from.y) * ease)
    await page.waitForTimeout(ms / steps)
  }
}

const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

async function tileBox(page, title) {
  const tile = page.locator(`div.rounded-xl:has(h3:text-is("${title}"))`).first()
  await tile.waitFor({ timeout: 8000 })
  return await tile.boundingBox()
}

async function recordTheme(token, theme) {
  await resetBoard(token)
  const tmpDir = path.join(TMP_DIR, theme)
  await import('node:fs').then((fs) => fs.mkdirSync(tmpDir, { recursive: true }))

  // Warm pass: prime vite transforms + covers so the recording has no loading pops.
  const warmBrowser = await chromium.launch({ headless: true })
  const warmContext = await warmBrowser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  const warmPage = await warmContext.newPage()
  await warmPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await warmPage.evaluate(({ t, theme }) => {
    localStorage.setItem('tome_token', t)
    localStorage.setItem('tome_theme', theme)
    localStorage.setItem('tome_stats_hint', '1')
  }, { t: token, theme })
  await warmPage.goto(`${BASE}/stats`, { waitUntil: 'networkidle', timeout: 60000 })
  await warmPage.waitForTimeout(1500)
  await warmBrowser.close()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: tmpDir, size: VIEWPORT },
  })
  const page = await context.newPage()
  await page.addInitScript(({ t, theme }) => {
    localStorage.setItem('tome_token', t)
    localStorage.setItem('tome_theme', theme)
    localStorage.setItem('tome_stats_hint', '1')
  }, { t: token, theme })
  await page.addInitScript(FAKE_CURSOR)

  await page.goto(`${BASE}/stats`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1400)

  // Continuous cursor: every move starts where the previous one ended, every
  // click happens at the cursor after a settle beat. No teleporting — that's
  // what made earlier takes read as random clicking.
  let cur = { x: 720, y: 300 }
  await page.mouse.move(cur.x, cur.y)
  const moveTo = async (to, ms = 700) => {
    await glide(page, cur, to, ms)
    cur = to
  }
  const settleClick = async () => {
    await page.waitForTimeout(220)
    await page.mouse.down()
    await page.waitForTimeout(90)
    await page.mouse.up()
  }

  // 1. Enter edit mode
  const editBox = await page.locator('button:has-text("Edit")').first().boundingBox()
  await moveTo(center(editBox), 800)
  await settleClick()
  await page.waitForTimeout(1100)

  // 2. Drag "Top Books by Reading Time" over to the left — RGL reflows live.
  const topBooks = await tileBox(page, 'Top Books by Reading Time')
  await moveTo({ x: topBooks.x + 120, y: topBooks.y + 16 }, 800) // header = drag handle
  await page.waitForTimeout(250)
  await page.mouse.down()
  await page.waitForTimeout(300)
  await moveTo({ x: cur.x - topBooks.width * 0.9, y: cur.y }, 1200)
  await page.waitForTimeout(400)
  await page.mouse.up()
  await page.waitForTimeout(1200)

  // 3. Resize "Currently Reading" down to its content — in edit mode it shows
  // its full saved footprint (auto-fit is view-only), so with two books in
  // progress it reads as the obvious thing to shrink.
  const readingItem = page.locator('.react-grid-item:has(h3:text-is("Currently Reading"))').first()
  const seBox = await readingItem.locator('.react-resizable-handle-se').boundingBox()
  await moveTo({ x: seBox.x + seBox.width * 0.7, y: seBox.y + seBox.height * 0.7 }, 800)
  await page.waitForTimeout(250)
  await page.mouse.down()
  await page.waitForTimeout(300)
  await moveTo({ x: cur.x, y: cur.y - 170 }, 1000)
  await page.waitForTimeout(400)
  await page.mouse.up()
  await page.waitForTimeout(1200)

  // 4. Config popover on the daily chart: flip it to an area chart.
  const dailyTile = page.locator('div.rounded-xl:has(h3:text-is("Reading Time per Day"))').first()
  const cfgBox = await areaBox_safe(dailyTile.locator('button[aria-label="Configure"]'))
  if (cfgBox) {
    await moveTo(center(cfgBox), 800)
    await settleClick()
    await page.waitForTimeout(900)
    const areaBox = await areaBox_safe(page.locator('button:text-is("area")').first())
    if (areaBox) {
      await moveTo(center(areaBox), 600)
      await settleClick()
      await page.waitForTimeout(1100)
    }
    // Close by clicking the popover's backdrop — a blind Escape would exit
    // edit mode if the popover already closed itself, and the gear sits
    // under the backdrop while it's open. Step just left of the popover so
    // the dismissal looks like a deliberate click-away, not a jump.
    if (await areaBox_safe(page.locator('div.fixed.inset-0.z-40').first())) {
      await moveTo({ x: Math.max(40, cur.x - 260), y: cur.y + 40 }, 500)
      await settleClick()
    }
    await page.waitForTimeout(700)
  }

  // 5. Add a widget from the gallery.
  const addBox = await areaBox_safe(page.locator('button:has-text("Add tile")').first())
  if (addBox) {
    await moveTo(center(addBox), 900)
    await settleClick()
    await page.waitForTimeout(1300)
    const cardBox = await areaBox_safe(page.locator('button:has(span:text-is("Reading by Weekday"))').first())
    if (cardBox) {
      await moveTo(center(cardBox), 800)
      await settleClick()
      await page.waitForTimeout(800)
    }
    // Dismiss by clicking the dimmed backdrop beside the panel — visible intent.
    if (await areaBox_safe(page.locator('input[placeholder*="Search"]').first())) {
      await moveTo({ x: 90, y: 500 }, 500)
      await settleClick()
    }
    await page.waitForTimeout(900)
  }

  // 6. Done — back to view mode, idle on the result.
  const doneBox = await page.locator('button:has-text("Done")').first().boundingBox()
  await moveTo(center(doneBox), 800)
  await settleClick()
  await page.waitForTimeout(900)
  // End on the full settled board, not wherever editing left the scroll.
  await page.evaluate(() => new Promise((resolve) => {
    const start = window.scrollY
    if (start === 0) return resolve(null)
    const t0 = performance.now()
    const dur = 900
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1)
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      window.scrollTo(0, start * (1 - ease))
      p < 1 ? requestAnimationFrame(step) : resolve(null)
    }
    requestAnimationFrame(step)
  }))
  await page.waitForTimeout(1500)

  await page.close()
  await context.close()
  await browser.close()

  const files = await readdir(tmpDir)
  const fs = await import('node:fs')
  const webm = files.find((f) => f.endsWith('.webm') && fs.statSync(path.join(tmpDir, f)).size > 0)
  if (webm) {
    const dest = path.join(OUT_DIR, `stats-edit-${theme}.webm`)
    await rename(path.join(tmpDir, webm), dest)
    console.log(`  ${theme}: ${dest}`)
  }
  const remaining = await readdir(tmpDir)
  for (const f of remaining) await unlink(path.join(tmpDir, f)).catch(() => {})
  fs.rmdirSync(tmpDir, { recursive: true })
  await resetBoard(token)
}

// boundingBox that tolerates the element not existing.
async function areaBox_safe(locator) {
  try {
    await locator.waitFor({ timeout: 4000 })
    return await locator.boundingBox()
  } catch {
    return null
  }
}

async function run() {
  const token = await getToken()
  console.log('Recording stats editing demo…')
  for (const theme of THEMES) {
    console.log(`  Recording ${theme}…`)
    await recordTheme(token, theme)
  }
  await import('node:fs').then((fs) => fs.rmSync(TMP_DIR, { recursive: true, force: true }))
  console.log('Done.')
}

run().catch((e) => { console.error(e); process.exit(1) })
