// Run against the Vite server; PLAYWRIGHT_MODULE may reference an external runtime.
import assert from 'node:assert/strict'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1100, height: 750 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://localhost:9530/#/workbench')
    const entry = page.getByRole('button', { name: 'Iframe 演示', exact: true })
    await entry.waitFor()
    for (const [width, zoom] of [[1100, 1], [880, 1], [880, 2]]) {
      await page.setViewportSize({ width, height: 750 })
      await page.evaluate(async (zoom) => {
        const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
        useWorkbenchLayoutStore().setZoomLevel(zoom)
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }, zoom)
      const box = await entry.boundingBox()
      assert.ok(box && box.x >= 0 && box.x + box.width <= width, 'entry stays visible without scrolling toolbar')
      await entry.click()
      const input = page.frameLocator('iframe.workbench-iframe').getByPlaceholder('例如：电源检查')
      await input.fill('Iframe input works')
      assert.equal(await input.inputValue(), 'Iframe input works')
      await entry.click()
      assert.equal(await page.locator('iframe.workbench-iframe').count(), 1, 'opening again reuses the panel')
    }
    await page.setViewportSize({ width: 1100, height: 750 })
    await page.evaluate(async () => {
      const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
      useWorkbenchLayoutStore().resetZoom()
    })
    await entry.click()
    await page.screenshot({ path: '/tmp/workbench-iframe-entry.png' })
    assert.deepEqual(errors, [])
    console.warn('PASS visible Iframe Demo entry at 1100/880px and 100/200% zoom, iframe loading/input, repeated opening')
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
