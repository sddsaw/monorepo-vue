// Run against the Vite dev server. Set PLAYWRIGHT_MODULE to a Playwright module
// path when Playwright is supplied by an external browser-testing runtime.
import assert from 'node:assert/strict'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const settle = () => page.waitForTimeout(250)
  const outputTab = () => page.getByText('输出 (Output)', { exact: true })
  const logsTab = () => page.getByText('本地日志 (Logs)', { exact: true })

  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://127.0.0.1:9530/workbench')
    await page.locator('.bottom-panel-tabs').waitFor({ state: 'attached' })
    // Use Vue's dev instance only as a fixture for the public xterm buffer and
    // exposed log API. No production test hooks or xterm private APIs are needed.
    await page.evaluate(() => {
      let component = document.querySelector('.output-terminal-wrapper')?.__vueParentComponent
      while (component && component.type.__name !== 'OutputTerminal')
        component = component.parent
      if (!component)
        throw new Error('Output terminal must exist before its first tab activation')
      window.terminalFixture = { term: component.setupState.term, api: component.exposed }
    })
    const buffer = () => page.evaluate(() => {
      const { term } = window.terminalFixture
      return Array.from({ length: term.buffer.active.length }, (_, i) => term.buffer.active.getLine(i).translateToString(true)).join('\n')
    })
    const flush = () => page.evaluate(() => new Promise(resolve => window.terminalFixture.term.write('', resolve)))
    const setVisible = visible => page.evaluate(async (value) => {
      const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
      useWorkbenchLayoutStore().setBottomPanelVisible(value)
    }, visible)
    await page.evaluate(() => window.terminalFixture.api.appendLog('BEFORE_FIRST_ACTIVATION'))
    await setVisible(true)
    await settle()
    await outputTab().click()
    await page.locator('.xterm').waitFor()
    await page.getByRole('button', { name: '暂停模拟日志推流', exact: true }).click()
    await flush()
    assert.match(await buffer(), /BEFORE_FIRST_ACTIVATION/)
    const originalTerminal = await page.locator('.xterm').elementHandle()
    await logsTab().click()
    await page.evaluate(() => window.terminalFixture.api.appendLog('WHILE_LOGS_VISIBLE'))
    await outputTab().click()
    await flush()
    assert.equal(await originalTerminal.evaluate(element => element.isConnected), true)
    assert.match(await buffer(), /WHILE_LOGS_VISIBLE/)
    await setVisible(false)
    await page.evaluate(() => window.terminalFixture.api.appendLog('WHILE_PANEL_COLLAPSED'))
    await setVisible(true)
    await settle()
    assert.match(await buffer(), /WHILE_PANEL_COLLAPSED/)
    console.warn('PASS logs survive first activation, tab switches and panel collapse')

    await page.evaluate(() => {
      const { term, api } = window.terminalFixture
      for (let i = 0; i < 1000; i++)
        api.appendLog(`OLD_QUEUED_${i}`)
      term.write('OLD_CURRENT_LINE')
      api.clearLog()
      api.appendLog('AFTER_CLEAR')
    })
    await flush()
    assert.doesNotMatch(await buffer(), /OLD_/)
    assert.match(await buffer(), /AFTER_CLEAR/)
    await page.getByRole('button', { name: '清空输出', exact: true }).click()
    await flush()
    assert.equal((await buffer()).trim(), '')
    await page.evaluate(() => window.terminalFixture.api.appendLog('CONTEXT_CLEAR'))
    await flush()
    await page.locator('.output-terminal-wrapper').click({ button: 'right' })
    await page.getByText('清空输出 (Clear)', { exact: true }).click()
    await flush()
    assert.equal((await buffer()).trim(), '')
    console.warn('PASS clear removes queued output, current line and history through both UI actions')

    await page.evaluate(() => {
      window.copiedOutput = []
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async text => window.copiedOutput.push(text),
      })
      window.terminalFixture.api.appendLog('COPY_ONCE')
    })
    await flush()
    await page.evaluate(() => {
      window.terminalFixture.term.selectAll()
      window.terminalFixture.term.focus()
    })
    await page.keyboard.press('Control+c')
    assert.equal(await page.evaluate(() => window.copiedOutput.length), 1)
    assert.match(await page.evaluate(() => window.copiedOutput[0]), /COPY_ONCE/)
    await page.evaluate(() => window.terminalFixture.term.clearSelection())

    await page.getByRole('button', { name: '灌入 1,000 条日志', exact: true }).click()
    await flush()
    assert.ok((await buffer()).split('\n').length >= 1000)
    await page.evaluate(() => window.terminalFixture.term.scrollToTop())
    await page.setViewportSize({ width: 1500, height: 1000 })
    await settle()
    assert.equal(await page.evaluate(() => window.terminalFixture.term.buffer.active.viewportY), 0)
    await logsTab().click()
    await outputTab().click()
    await settle()
    assert.equal(await page.evaluate(() => window.terminalFixture.term.buffer.active.viewportY), 0)
    console.warn('PASS bulk output and history position after resizing and tab switching')

    for (const zoom of [0.6, 1, 1.5, 2]) {
      for (const font of [12, 14, 18]) {
        await page.evaluate(async ({ zoom, font }) => {
          const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
          const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
          useWorkbenchLayoutStore().setZoomLevel(zoom)
          useThemeStore().setFontSize(font)
        }, { zoom, font })
        await settle()
        const geometry = await page.locator('.output-terminal-wrapper').evaluate((host) => {
          const bounds = selector => document.querySelector(selector).getBoundingClientRect().toJSON()
          return {
            host: host.getBoundingClientRect().toJSON(),
            screen: bounds('.xterm-screen'),
            nav: bounds('.bottom-panel-tabs .n-tabs-nav'),
            bar: bounds('.bottom-panel-tabs .n-tabs-bar'),
            tabs: bounds('.bottom-panel-tabs'),
          }
        })
        assert.ok(Math.abs(geometry.nav.height - 32 * Math.max(1, font / 14) * zoom) < 1)
        assert.ok(Math.abs(geometry.nav.bottom - geometry.bar.bottom) <= zoom + 0.5, JSON.stringify(geometry))
        assert.ok(geometry.host.bottom <= geometry.tabs.bottom + 1, JSON.stringify(geometry))
        assert.ok(geometry.screen.bottom <= geometry.host.bottom + 1, JSON.stringify(geometry))
        assert.ok(geometry.screen.right <= geometry.host.right + 1, JSON.stringify(geometry))
        assert.ok(geometry.screen.height > 0 && geometry.screen.width > 0)
      }
    }
    console.warn('PASS compact header and unclipped terminal across 60–200% zoom and 12–18px fonts')

    await page.evaluate(async () => {
      const { useWorkbenchLayoutStore } = await import('/src/store/modules/workbenchLayout/index.ts')
      const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
      useWorkbenchLayoutStore().setZoomLevel(1)
      useThemeStore().setFontSize(14)
      useThemeStore().setThemeScheme('light')
    })
    await page.getByRole('button', { name: '最大化面板', exact: true }).click()
    await settle()
    await page.getByRole('button', { name: '还原面板大小', exact: true }).click()
    await settle()
    await page.evaluate(() => window.terminalFixture.term.scrollToBottom())
    assert.equal(await page.locator('.xterm-viewport').evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)')
    await page.screenshot({ path: '/private/tmp/bottom-panel-after-light.png' })
    await page.evaluate(async () => {
      const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
      useThemeStore().setThemeScheme('dark')
    })
    await settle()
    await page.screenshot({ path: '/private/tmp/bottom-panel-after-dark.png' })
    for (let i = 0; i < 4; i++) {
      await logsTab().click()
      await outputTab().click()
    }
    await page.evaluate(() => {
      const root = document.querySelector('#app')
      root.__vue_app__.unmount()
    })
    await settle()
    assert.equal(await page.locator('.xterm').count(), 0)
    assert.deepEqual(errors, [])
    console.warn('PASS maximize/restore, light/dark themes and clean unmount without page errors')
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
