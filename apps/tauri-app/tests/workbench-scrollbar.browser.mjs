// Run against the Vite server. PLAYWRIGHT_MODULE may point to an external runtime.
import assert from 'node:assert/strict'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  // Headless Chrome hides native scrollbars by default; this test drags the real thumb.
  const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://localhost:9530/#/workbench')
    await page.locator('.workbench-dock-tab').first().waitFor()
    await page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      await store.loadFile('/workspace/scrollbar-test.json', JSON.stringify({
        testSuites: [{ name: 'suite', items: ['Power_Clamp', 'Diff_Pairs', 'Ground_Clamp'].map(name => ({
          id: name,
          name,
          testType: 'Continuity',
        })) }],
      }))
      for (const node of store.treeData[0].children)
        store.openTab(node)
    })
    for (const [name, action] of [['Ground_Clamp', '向下分屏'], ['Diff_Pairs', '向右分屏']]) {
      await page.locator('.workbench-dock-tab').filter({ hasText: name }).click({ button: 'right' })
      await page.getByText(action, { exact: true }).last().click()
      await page.getByText(action, { exact: true }).last().waitFor({ state: 'hidden' })
    }
    const rightContent = page.locator('.dock-content').filter({ has: page.locator('.n-breadcrumb').filter({ hasText: 'Diff_Pairs' }) })
    // Dedicated overflow fixture: exercise native scrollbar geometry independently of business form content.
    await rightContent.locator('.dock-content__body').evaluate((element) => {
      const fixture = document.createElement('div')
      fixture.style.cssText = 'width: 900px; height: 1400px;'
      fixture.textContent = 'Scrollable test content'
      element.prepend(fixture)
    })
    const columnSash = page.locator('.workbench-dockview .horizontal > .sash-container > .sash').first()
    const divider = await columnSash.boundingBox()
    const bounds = await page.locator('.workbench-dockview').boundingBox()
    await page.mouse.move(divider.x + divider.width / 2, divider.y + divider.height / 3)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width - 220, divider.y + divider.height / 3, { steps: 12 })
    await page.mouse.up()

    for (const mode of ['content', 'wrapper']) {
      for (const zoom of [1, 1.5, 2]) {
        await page.evaluate(async ({ mode, zoom }) => {
          const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
          const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
          useThemeStore().layout.scrollMode = mode
          useWorkbenchLayoutStore().setZoomLevel(zoom)
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        }, { mode, zoom })
        const scroll = mode === 'wrapper' ? rightContent : rightContent.locator('.dock-content__body')
        const area = await scroll.evaluate((element) => {
          element.scrollLeft = 0
          element.scrollTop = 0
          const rect = element.getBoundingClientRect()
          const scale = rect.width / element.offsetWidth
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            scale,
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            scrollHeight: element.scrollHeight,
          }
        })
        assert.ok(area.scrollWidth > area.clientWidth, `narrow business panel has a horizontal scrollbar: ${JSON.stringify(area)}`)
        const thumbX = area.x + area.clientWidth * area.clientWidth / area.scrollWidth * area.scale / 2
        const thumbY = area.y + area.height - 2 * area.scale
        // The bottom pixels of the scrollbar were covered by the expanded row sash.
        const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.className, { x: thumbX, y: thumbY })
        assert.ok(!String(hit).includes('sash'), `scrollbar must not hit sash (${mode}, ${zoom}): ${hit}`)
        const before = await page.locator('.workbench-dockview .groupview').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()))
        await page.mouse.move(thumbX, thumbY)
        await page.mouse.down()
        await page.mouse.move(thumbX + 50, thumbY, { steps: 10 })
        await page.mouse.up()
        assert.ok(await scroll.evaluate(element => element.scrollLeft > 0), `scrollbar drag scrolls content (${mode}, ${zoom})`)
        const after = await page.locator('.workbench-dockview .groupview').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()))
        assert.deepEqual(after, before, 'scrollbar drag must not resize any group')
      }
    }
    console.warn('PASS native horizontal scrollbar drag leaves nested split dimensions unchanged at 100–200% zoom in both scroll modes')
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
