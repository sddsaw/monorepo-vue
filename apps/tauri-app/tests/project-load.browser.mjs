// Run against Vite. PLAYWRIGHT_MODULE can point to an externally provided Playwright runtime.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1100, height: 750 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const fixture = process.env.PRX_FIXTURE
    ? await readFile(process.env.PRX_FIXTURE)
    : Buffer.from(JSON.stringify({ device: 'TestChip', revision: '1', part: 'part1', env: 'env1', name: 'Prox.prx' }))
  function routeUrl(path) {
    const url = new URL(process.env.WORKBENCH_URL || 'http://127.0.0.1:9530/')
    url.hash = path
    return url.href
  }
  const openButton = () => page.getByRole('button', { name: 'Open Project' })
  const modal = () => page.getByRole('dialog')
  function state() {
    return page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      return { path: store.filePath, data: store.rawJson, tree: store.treeData, busy: store.projectBusy, status: store.projectLoad.status }
    })
  }
  async function upload(name, content, fromHome = true) {
    const chooserPromise = page.waitForEvent('filechooser')
    if (fromHome)
      await openButton().click()
    else
      await page.keyboard.press('ControlOrMeta+o')
    const chooser = await chooserPromise
    assert.equal(await chooser.element().getAttribute('accept'), '.prx')
    assert.equal(chooser.isMultiple(), false)
    await chooser.setFiles({ name, mimeType: 'application/json', buffer: content })
  }

  try {
    await page.addInitScript(() => localStorage.setItem('ate_last_opened_file', '/old/demo.json'))
    await page.goto(routeUrl('/'))
    await openButton().waitFor()
    assert.equal(new URL(page.url()).hash, '#/project')

    // A cold workbench URL must resolve to the project route before mounting the editor.
    await page.goto(routeUrl('/workbench'))
    await openButton().waitFor()
    assert.equal(new URL(page.url()).hash, '#/project')
    assert.equal((await state()).data, null)
    assert.equal(await page.locator('.workbench-shell').count(), 0)
    await page.screenshot({ path: '/tmp/proxima-home.png' })

    // Dismissing the system chooser must allow another attempt.
    const chooserPromise = page.waitForEvent('filechooser')
    await openButton().click()
    const chooser = await chooserPromise
    await chooser.element().dispatchEvent('cancel')
    await page.waitForFunction(() => !document.querySelector('.action-card-open')?.disabled)

    await upload('invalid.json', fixture)
    await page.getByRole('alert').filter({ hasText: '请选择 .prx' }).waitFor()
    assert.equal((await state()).data, null)
    await page.getByRole('button', { name: '返回', exact: true }).click()

    await upload('broken.prx', Buffer.from('{broken'))
    await page.getByRole('alert').filter({ hasText: '不是有效的 JSON' }).waitFor()
    assert.equal((await state()).path, '')
    await page.getByRole('button', { name: '返回', exact: true }).click()

    await upload('cancel.prx', fixture)
    await page.getByRole('button', { name: '取消加载', exact: true }).click()
    await page.waitForTimeout(2700)
    assert.equal((await state()).data, null)
    assert.equal((await state()).busy, false)

    assert.equal(new URL(page.url()).hash, '#/project')

    // Retrying from the shared dialog must follow the same successful route transition.
    await upload('retry.prx', Buffer.from('{broken'))
    await page.getByRole('alert').filter({ hasText: '不是有效的 JSON' }).waitFor()
    const retryChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: '重新选择文件', exact: true }).click()
    await (await retryChooserPromise).setFiles({ name: 'Prox.prx', mimeType: 'application/json', buffer: fixture })
    await page.getByRole('progressbar', { name: '程序加载进度' }).waitFor()
    await page.waitForFunction(() => Number(document.querySelector('[aria-label="程序加载进度"]')?.getAttribute('aria-valuenow')) >= 30)
    assert.match(await modal().textContent(), /Prox.prx/)
    assert.equal((await state()).data, null)
    await page.screenshot({ path: '/tmp/proxima-loading.png' })
    await page.locator('.workbench-shell').waitFor()
    await page.locator('.ate-workbench-tree').waitFor()
    assert.equal(new URL(page.url()).hash, '#/workbench')
    const loaded = await state()
    assert.equal(loaded.path, 'Prox.prx')
    assert.deepEqual(loaded.data, JSON.parse(fixture))
    assert.equal(loaded.tree.length, 5)
    assert.match(await page.locator('.ate-workbench-tree').textContent(), /device: TestChip/)
    await page.locator('pre').filter({ hasText: 'TestChip' }).waitFor()
    await page.screenshot({ path: '/tmp/proxima-workbench.png' })

    // Home remains an independent route even with an already-loaded project.
    await page.goBack()
    await openButton().waitFor()
    assert.equal(new URL(page.url()).hash, '#/project')
    assert.equal(await page.locator('.workbench-shell').count(), 0)
    assert.deepEqual((await state()).data, loaded.data)
    await page.goForward()
    await page.locator('.workbench-shell').waitFor()
    assert.equal(new URL(page.url()).hash, '#/workbench')

    // A failed replacement must preserve the loaded tree and document.
    await upload('replacement.prx', Buffer.from('null'), false)
    await page.getByRole('alert').filter({ hasText: '非空的 JSON 对象' }).waitFor()
    assert.deepEqual((await state()).data, loaded.data)
    await page.getByRole('button', { name: '返回', exact: true }).click()

    // A different program must replace the original navigation and use its own name.
    const changed = { name: 'Different Program', enabled: false, count: 0, optional: null }
    await upload('different.PRX', Buffer.from(JSON.stringify(changed)), false)
    await modal().getByText('Different Program', { exact: true }).waitFor()
    await page.locator('.ate-workbench-tree').getByText('name: Different Program', { exact: true }).waitFor()
    assert.deepEqual((await state()).data, changed)
    assert.doesNotMatch(await page.locator('.ate-workbench-tree').textContent(), /device: TestChip/)
    await page.getByText('enabled: false', { exact: true }).click()
    await page.locator('pre').filter({ hasText: /^false$/ }).waitFor()

    // Relaunch always returns to the home page, retaining only real recent entries.
    await page.reload()
    await openButton().waitFor()
    assert.equal((await state()).data, null)
    assert.equal(new URL(page.url()).hash, '#/project')
    assert.match(await page.getByRole('region', { name: 'RECENT PROJECTS' }).textContent(), /Different Program/)
    await page.setViewportSize({ width: 640, height: 850 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    assert.equal(overflow, false)
    await page.screenshot({ path: '/tmp/proxima-home-narrow.png' })
    // Recent projects also enter the workbench route after selecting the file in web mode.
    const recentChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('region', { name: 'RECENT PROJECTS' }).getByText('Different Program', { exact: true }).click()
    await (await recentChooserPromise).setFiles({ name: 'different.PRX', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) })
    await page.locator('.workbench-shell').waitFor()
    assert.equal(new URL(page.url()).hash, '#/workbench')
    assert.deepEqual((await state()).data, changed)
    assert.deepEqual(errors, [])
    console.warn('PASS root/workbench routing, back/forward navigation, dialog retry, recent project routing, initial home, chooser cancellation, extension/JSON validation, load cancellation, progress, fixture tree, replacement, false values, relaunch and narrow layout')
  }
  catch (error) {
    await page.screenshot({ path: '/tmp/proxima-test-failure.png' })
    console.error('PAGE ERRORS', errors)
    console.error('TREE MARKUP', await page.locator('.ate-workbench-tree').evaluateAll(nodes => nodes.map(node => node.outerHTML.slice(0, 1000))))
    throw error
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
