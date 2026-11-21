// Run against pnpm dev (or pnpm dev:tauri's Vite server).
// PLAYWRIGHT_MODULE may point to an externally installed Playwright module.
import assert from 'node:assert/strict'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))

  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://localhost:9530/#/workbench')
    await page.locator('.workbench-dock-tab').first().waitFor()
    await page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      await store.loadFile('/workspace/iframe-test.json', JSON.stringify({
        testSuites: [{ name: 'suite', items: ['Top', 'Bottom'].map(name => ({
          id: name,
          name,
          testType: 'Continuity',
        })) }],
      }))
      for (const node of store.treeData[0].children)
        store.openTab(node)
    })
    await page.getByRole('button', { name: 'Iframe 演示', exact: true }).click()
    const iframe = page.locator('iframe.workbench-iframe')
    const input = page.frameLocator('iframe.workbench-iframe').getByPlaceholder('例如：电源检查')
    await input.fill('Embedded form')
    await page.locator('.workbench-dock-tab').filter({ hasText: 'Iframe 演示' }).click({ button: 'right' })
    await page.getByText('向下分屏', { exact: true }).click()
    await page.getByText('向下分屏', { exact: true }).waitFor({ state: 'hidden' })
    await page.waitForFunction(() => document.querySelectorAll('.workbench-dockview .groupview').length === 2)

    // Place Bottom beside the iframe to reproduce one full-width group above two groups.
    const source = await page.locator('.workbench-dock-tab').filter({ hasText: 'Bottom' }).boundingBox()
    const target = await iframe.boundingBox()
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
    await page.mouse.down()
    await page.mouse.move(source.x + source.width / 2, source.y + source.height + 20, { steps: 8 })
    await page.mouse.move(target.x + target.width - 30, target.y + target.height / 2, { steps: 20 })
    await page.mouse.move(target.x + target.width - 28, target.y + target.height / 2)
    await page.mouse.up()
    await page.waitForFunction(() => document.querySelectorAll('.workbench-dockview .groupview').length === 3)
    await input.fill('Keep while resizing')

    for (const zoom of [0.6, 1, 1.5, 2]) {
      await page.evaluate(async (value) => {
        const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
        useWorkbenchLayoutStore().setZoomLevel(value)
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }, zoom)
      for (const orientation of ['vertical', 'horizontal']) {
        const sash = page.locator(`.workbench-dockview .split-view-container.${orientation} > .sash-container > .sash`).first()
        const appearance = await sash.evaluate(element => ({
          line: getComputedStyle(element, '::before').backgroundColor,
          handle: getComputedStyle(element, '::after').backgroundImage,
        }))
        assert.notEqual(appearance.line, 'rgba(0, 0, 0, 0)', 'split boundary line is visible')
        assert.notEqual(appearance.handle, 'none', 'split boundary has a drag handle')
        const box = await sash.boundingBox()
        const across = orientation === 'horizontal'
        // Five pixels from the center is outside Dockview's original four-pixel target.
        // Avoid the intersection of the two split axes.
        const x = box.x + (across ? box.width / 2 + 5 : box.width / 3)
        const y = box.y + (across ? box.height / 3 : box.height / 2 + 5)
        const hit = await sash.evaluate((element, point) => ({
          matches: document.elementFromPoint(point.x, point.y) === element,
          target: document.elementFromPoint(point.x, point.y)?.className,
          area: getComputedStyle(element, '::after').inset,
        }), { x, y })
        assert.ok(hit.matches, `${orientation} target at zoom ${zoom}: ${JSON.stringify(hit)}`)
        const before = await page.locator('.workbench-dockview .groupview').evaluateAll(elements => elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return { width: rect.width, height: rect.height }
        }))
        await page.mouse.move(x, y)
        const hover = await sash.evaluate(element => ({
          cursor: getComputedStyle(element, '::after').cursor,
          backgroundColor: getComputedStyle(element, '::after').backgroundColor,
        }))
        assert.equal(hover.cursor, across ? 'ew-resize' : 'ns-resize')
        assert.notEqual(hover.backgroundColor, 'rgba(0, 0, 0, 0)', 'hover highlights the resize area immediately')
        await page.evaluate(() => window.getSelection()?.removeAllRanges())
        await page.mouse.down()
        assert.equal(await iframe.evaluate(element => element.style.pointerEvents), 'none')
        await page.mouse.move(x + (across ? 40 : 0), y + (across ? 0 : 40), { steps: 10 })
        assert.equal(await page.evaluate(() => window.getSelection()?.toString()), '', `${orientation} resize must not select text at zoom ${zoom}`)
        const after = await page.locator('.workbench-dockview .groupview').evaluateAll(elements => elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return { width: rect.width, height: rect.height }
        }))
        const dimension = across ? 'width' : 'height'
        assert.ok(after.some((rect, index) => Math.abs(rect[dimension] - before[index][dimension]) > 20), `${orientation} sash resizes at zoom ${zoom}: ${JSON.stringify({ before, after })}`)
        // Restore the starting proportions so later zoom cases do not accumulate minimum-size clamps.
        await page.mouse.move(x, y, { steps: 10 })
        await page.mouse.up()
        assert.notEqual(await iframe.evaluate(element => element.style.pointerEvents), 'none')
        assert.equal(await input.inputValue(), 'Keep while resizing')
      }
    }
    await input.fill('Interactive after resize')
    assert.equal(await input.inputValue(), 'Interactive after resize')
    await page.evaluate(async () => {
      const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
      useWorkbenchLayoutStore().resetZoom()
    })
    await page.locator('.dock-content__body').first().evaluate((element) => {
      const fixture = document.createElement('p')
      fixture.dataset.selectionFixture = 'true'
      fixture.style.userSelect = 'text'
      fixture.textContent = 'Selectable text after resizing'
      element.prepend(fixture)
      element.scrollTop = 0
    })
    const heading = page.locator('[data-selection-fixture]')
    await heading.click({ clickCount: 3 })
    assert.ok((await page.evaluate(() => window.getSelection()?.toString()))?.trim(), 'normal text selection remains available after resizing')
    assert.deepEqual(errors, [])
    console.warn('PASS iframe menu, nested splits, 12px resize targets at 60–200% zoom, iframe drag protection and input')
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
