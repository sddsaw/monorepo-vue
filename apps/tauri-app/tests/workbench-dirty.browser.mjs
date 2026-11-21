// Run against the Vite dev server; see bottom-panel.browser.mjs for runtime setup.
import assert from 'node:assert/strict'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))

  try {
    await page.goto(process.env.WORKBENCH_URL || 'http://127.0.0.1:9530/workbench')
    await page.locator('.workbench-shell').waitFor()
    await page.locator('.workbench-dock-tab').first().waitFor()
    await page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      await store.loadFile('/workspace/dirty-test.json', JSON.stringify({
        testSuites: [{ name: 'suite', items: [
          { id: 'left', name: 'Left', testType: 'Continuity' },
          { id: 'right', name: 'Right', testType: 'Continuity' },
        ] }],
      }))
      // Reuse tree IDs: the sidebar also automatically opens the first leaf.
      for (const node of store.treeData[0].children)
        store.openTab(node)
    })
    const left = page.locator('.workbench-dock-tab').filter({ hasText: 'Left' })
    const right = page.locator('.workbench-dock-tab').filter({ hasText: 'Right' })
    await left.waitFor()
    assert.equal(await page.locator('.dock-tab-dirty').count(), 0)
    await left.click()
    await page.getByPlaceholder('输入测试项名称').filter({ visible: true }).fill('Edited left')
    await left.locator('.dock-tab-dirty').waitFor()
    assert.match(await left.getAttribute('title'), /未保存|Unsaved/i)
    assert.equal(await right.locator('.dock-tab-dirty').count(), 0)

    await right.click()
    assert.equal(await left.locator('.dock-tab-dirty').count(), 1)
    await page.keyboard.press('Control+s')
    // Browser-only preview cannot write the native file, so the badge must remain.
    assert.equal(await left.locator('.dock-tab-dirty').count(), 1)

    // Dockview hides inactive tab close actions until the tab is hovered.
    await left.hover()
    await left.locator('button').click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    assert.equal(await left.count(), 1)
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    assert.equal(await left.locator('.dock-tab-dirty').count(), 1)

    await left.click({ button: 'middle' })
    await dialog.waitFor()
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    assert.equal(await left.count(), 1)

    await left.hover()
    await left.locator('button').click()
    await dialog.waitFor()
    await dialog.getByRole('button', { name: '仍然关闭', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    await left.waitFor({ state: 'detached' })
    await page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      store.openTab(store.treeData[0].children[0])
    })
    await left.locator('.dock-tab-dirty').waitFor()
    assert.equal(await page.getByPlaceholder('输入测试项名称').filter({ visible: true }).inputValue(), 'Edited left')

    for (const mode of ['chrome', 'button', 'slider']) {
      await page.evaluate(async (mode) => {
        const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
        useThemeStore().tab.mode = mode
      }, mode)
      const badge = await left.locator('.dock-tab-dirty').boundingBox()
      const tab = await left.boundingBox()
      assert.ok(badge.width > 0 && badge.x >= tab.x && badge.x + badge.width <= tab.x + tab.width)
    }

    // Clean tabs close immediately without a confirmation.
    await right.hover()
    await right.locator('button').click()
    await right.waitFor({ state: 'detached' })
    assert.equal(await dialog.count(), 0)
    await page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      store.openTab(store.treeData[0].children[1])
      store.updateItemField(['testSuites', 0, 'items', 1], 'name', 'Edited right')
    })
    await right.locator('.dock-tab-dirty').waitFor()
    for (const [tab, action] of [
      [right, '关闭其它'],
      [right, '关闭左侧'],
      [left, '关闭右侧'],
      [left, '关闭所有'],
    ]) {
      await tab.click({ button: 'right' })
      await page.getByText(action, { exact: true }).click()
      await dialog.waitFor()
      assert.equal(await dialog.count(), 1)
      assert.equal(await page.locator('.workbench-dock-tab').count(), 2)
      await dialog.getByRole('button', { name: '取消', exact: true }).click()
      await dialog.waitFor({ state: 'detached' })
      assert.equal(await page.locator('.workbench-dock-tab').count(), 2)
    }
    await left.click({ button: 'right' })
    await page.getByText('关闭所有', { exact: true }).click()
    await dialog.waitFor()
    await dialog.getByRole('button', { name: '仍然关闭', exact: true }).click()
    await left.waitFor({ state: 'detached' })
    await right.waitFor({ state: 'detached' })
    assert.deepEqual(errors, [])
    console.warn('PASS dirty badges, close confirmation/cancel/Esc/middle click, clean close and batch close confirmation')
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
