// Run with Vite and PLAYWRIGHT_MODULE pointing to an available Playwright runtime.
import assert from 'node:assert/strict'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] })
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://localhost:9530/#/workbench')
    await page.locator('.workbench-dock-tab').first().waitFor()
    await page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      await store.loadFile('/workspace/tab-overflow.json', JSON.stringify({
        testSuites: [{ name: 'suite', items: Array.from({ length: 24 }, (_, index) => ({
          id: String(index),
          name: `Long_Tab_Label_${index}`,
          testType: 'Continuity',
        })) }],
      }))
      for (const node of store.treeData[0].children.slice(0, 12))
        store.openTab(node)
    })
    const lastTab = page.locator('.workbench-dock-tab').filter({ hasText: /^Long_Tab_Label_11$/ })
    await lastTab.click({ button: 'right' })
    await page.getByText('向右分屏', { exact: true }).click()
    await page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      for (const node of store.treeData[0].children.slice(12))
        store.openTab(node)
    })
    await page.waitForFunction(() => document.querySelectorAll('.tabs-container').length === 2)

    async function assertLayout() {
      // Wait for the animation-frame centering following native activation and Vue rendering.
      await page.waitForFunction(() => [...document.querySelectorAll('.workbench-dockview .tabs-container')].every((strip) => {
        const active = strip.querySelector(':scope > .active-tab')
        if (!active)
          return false
        const box = strip.getBoundingClientRect()
        const tab = active.getBoundingClientRect()
        const delta = tab.left + tab.width / 2 - box.left - box.width / 2
        const target = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, strip.scrollLeft + delta))
        return Math.abs(target - strip.scrollLeft) < 2
      }))
      const layouts = await page.locator('.workbench-dockview .tabs-container').evaluateAll(strips => strips.map((strip) => {
        const active = strip.querySelector(':scope > .active-tab')
        const tab = active.getBoundingClientRect()
        const header = strip.parentElement.getBoundingClientRect()
        const content = active.querySelector('.workbench-dock-tab').getBoundingClientRect()
        const rootStyle = getComputedStyle(document.documentElement)
        const fontSize = Number.parseFloat(rootStyle.getPropertyValue('--app-font-size'))
        const zoom = Number.parseFloat(rootStyle.getPropertyValue('--app-zoom'))
        return { tabHeight: tab.height, contentHeight: content.height, headerHeight: header.height, expected: Math.ceil(32 * Math.max(1, fontSize / 14)) * zoom, overflow: strip.scrollWidth > strip.clientWidth }
      }))
      for (const result of layouts) {
        assert.ok(result.overflow)
        assert.ok(Math.abs(result.tabHeight - result.expected) < 1, JSON.stringify(result))
        assert.ok(Math.abs(result.headerHeight - result.tabHeight - 6) < 1, JSON.stringify(result))
        assert.ok(result.contentHeight >= result.tabHeight - 12, JSON.stringify(result))
      }
    }

    for (const mode of ['chrome', 'button', 'slider']) {
      for (const zoom of [0.6, 1, 1.5, 2]) {
        await page.evaluate(async ({ mode, zoom }) => {
          const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
          const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
          useThemeStore().tab.mode = mode
          useWorkbenchLayoutStore().setZoomLevel(zoom)
        }, { mode, zoom })
        for (const index of [5, 17, 0, 23]) {
          await page.evaluate(async (index) => {
            const { useTpStore } = await import('/src/store/modules/tp/index.ts')
            const store = useTpStore()
            store.openTab(store.treeData[0].children[index])
          }, index)
          await assertLayout()
        }
      }
    }
    // Font size 12 -> 14 leaves the fixed base tab height unchanged; only label widths change.
    for (const [fontSize, interfaceFont] of [[12, 'Inter'], [14, 'Inter'], [14, 'noto-serif-sc']]) {
      await page.evaluate(async ({ fontSize, interfaceFont }) => {
        const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
        const { useTpStore } = await import('/src/store/modules/tp/index.ts')
        const store = useTpStore()
        // Keep a middle tab selected on later iterations.
        if (!store.activeTab?.label.endsWith('_17'))
          store.openTab(store.treeData[0].children[17])
        useThemeStore().fontSize = fontSize
        useThemeStore().interfaceFont = interfaceFont
        await document.fonts.ready
      }, { fontSize, interfaceFont })
      await assertLayout()
    }
    await page.evaluate(async () => {
      const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
      const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
      useWorkbenchLayoutStore().resetZoom()
      useThemeStore().interfaceFont = 'system-default'
      useThemeStore().tab.mode = 'chrome'
    })
    await assertLayout()
    // Click a visible tab in each group; selection must center only within that group.
    for (const strip of await page.locator('.workbench-dockview .tabs-container').all()) {
      const point = await strip.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const tab = [...element.querySelectorAll(':scope > .tab:not(.active-tab)')].find((item) => {
          const box = item.getBoundingClientRect()
          return box.left + box.width / 2 > bounds.left && box.left + box.width / 2 < bounds.right
        })
        const box = tab.getBoundingClientRect()
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      })
      await page.mouse.click(point.x, point.y)
      await assertLayout()
    }
    // Manual scrolling must not be undone before the next selection/layout change.
    await page.locator('.tabs-container').first().evaluate(strip => strip.scrollLeft = 200)
    await page.waitForTimeout(150)
    assert.ok(Math.abs(await page.locator('.tabs-container').first().evaluate(strip => strip.scrollLeft) - 200) < 2)
    await page.screenshot({ path: '/tmp/workbench-tabs-overflow.png' })
    assert.deepEqual(errors, [])
    console.warn('PASS 24 tabs / 2 groups, fixed tab and track heights, centered activation with clamped ends, 3 tab modes and 60–200% zoom')
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
