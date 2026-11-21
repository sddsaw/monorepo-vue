// Run against Vite; PLAYWRIGHT_MODULE may point to an external Playwright runtime.
import assert from 'node:assert/strict'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://localhost:9530/#/workbench')
    const opener = page.getByRole('button', { name: '设置 (Ctrl+,)', exact: true })
    await opener.click()
    const modal = page.locator('.settings-modal')
    await modal.waitFor()
    await modal.evaluate(async (element) => {
      await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
    })
    const navigation = modal.getByRole('navigation')
    assert.deepEqual(await navigation.getByRole('button').allTextContents().then(items => items.map(item => item.trim())), ['外观设置', '关于我们'])
    for (const name of ['主题颜色', '水印设置', '内容区域设置'])
      assert.equal(await modal.getByRole('heading', { name, exact: true }).count(), 1)

    const scroll = modal.locator('.settings-content .n-scrollbar-container')
    const navBefore = await navigation.evaluate(element => element.getBoundingClientRect().top - element.closest('.settings-modal').getBoundingClientRect().top)
    const watermark = modal.getByRole('switch', { name: '显示全屏水印', exact: true })
    await watermark.scrollIntoViewIfNeeded()
    assert.ok(await scroll.evaluate(element => element.scrollTop > 0))
    assert.equal(await navigation.getByRole('button', { name: '外观设置' }).getAttribute('aria-current'), 'page')
    assert.ok(Math.abs(await navigation.evaluate(element => element.getBoundingClientRect().top - element.closest('.settings-modal').getBoundingClientRect().top) - navBefore) < 1)
    const wasChecked = await watermark.getAttribute('aria-checked')
    await watermark.click()
    await navigation.getByRole('button', { name: '关于我们' }).click()
    await modal.getByText('Soybean Desktop', { exact: true }).waitFor()
    assert.equal(await scroll.evaluate(element => element.scrollTop), 0)
    assert.equal(await modal.getByRole('heading', { name: '水印设置' }).count(), 0)
    await navigation.getByRole('button', { name: '外观设置' }).click()
    await watermark.waitFor({ state: 'attached' })
    assert.equal(await scroll.evaluate(element => element.scrollTop), 0)
    assert.notEqual(await watermark.getAttribute('aria-checked'), wasChecked)
    await watermark.scrollIntoViewIfNeeded()
    await watermark.click()

    for (const scenario of [
      { width: 1440, height: 1000, font: 14, zoom: 1, scheme: 'light' },
      { width: 1440, height: 1000, font: 16, zoom: 2, scheme: 'dark' },
      { width: 600, height: 800, font: 16, zoom: 1, scheme: 'light' },
      { width: 390, height: 760, font: 10, zoom: 1, scheme: 'dark' },
    ]) {
      await page.setViewportSize({ width: scenario.width, height: scenario.height })
      await page.evaluate(async ({ font, zoom, scheme }) => {
        const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
        const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
        useThemeStore().setFontSize(font)
        useThemeStore().setThemeScheme(scheme)
        useWorkbenchLayoutStore().setZoomLevel(zoom)
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }, scenario)
      const bounds = await modal.boundingBox()
      assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= scenario.width + 1, JSON.stringify({ scenario, bounds }))
      assert.ok(bounds.height <= scenario.height + 1)
      assert.ok(await scroll.evaluate(element => element.clientHeight > 0 && element.scrollWidth <= element.clientWidth + 1), JSON.stringify(scenario))
      await modal.screenshot({ path: `/private/tmp/settings-${scenario.width}-${scenario.scheme}.png`, animations: 'disabled' })
      await watermark.scrollIntoViewIfNeeded()
      await watermark.click()
      await modal.getByRole('switch', { name: '启用用户名水印', exact: true }).waitFor({ state: 'attached' })
      assert.ok(await scroll.evaluate(element => element.scrollWidth <= element.clientWidth + 1))
      await watermark.click()
      for (const name of ['关于我们', '外观设置']) {
        await navigation.getByRole('button', { name }).click()
        await modal.locator('#settings-page-title').filter({ hasText: name }).waitFor()
        assert.equal(await scroll.evaluate(element => element.scrollTop), 0)
      }
    }
    await page.keyboard.press('Escape')
    await modal.waitFor({ state: 'hidden' })
    assert.equal(await opener.getAttribute('aria-expanded'), 'false')
    assert.deepEqual(errors, [])
    process.stdout.write('Settings dialog: navigation, scrolling, state persistence, close, themes, font sizes and responsive zoom passed.\n')
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
