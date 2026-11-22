import assert from 'node:assert/strict'
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  async function state() {
    return page.evaluate(async () => {
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      return { data: store.rawJson.definitions.find(file => file.type === 'pinmap').content, dirty: store.isDirty, tabs: store.tabs }
    })
  }
  const fixture = await mkdtemp(path.join(tmpdir(), 'pin-table-browser-'))
  try {
    // A temporary copy isolates browser edits and concurrent changes to the user's data.
    await cp(process.env.PROJECT_FIXTURE || '/Users/zhouenbo/Desktop/93k', fixture, { recursive: true })
    await writeFile(path.join(fixture, 'DefFiles', 'pinmap.json'), JSON.stringify({
      DefFileType: 'pinmap',
      metadata: { sheetId: 'browser-pinmap', version: '1' },
      individualPins: [{ id: 'pin-001', pinName: 'A0', type: 'Input', comment: '' }],
      pinGroups: [{ id: 'grp-001', groupName: 'DQ', pinName: 'DQ0', type: 'I/O', comment: '' }],
    }))
    await page.goto(process.env.WORKBENCH_URL || 'http://127.0.0.1:9530')
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /选择.*工程目录/ }).click()
    await (await chooser).setFiles(fixture)
    await page.locator('.workbench-shell').waitFor()
    await page.locator('.ate-workbench-tree').getByText('pinmap', { exact: true }).click()
    let editor = page.locator('.pin-table-editor:visible')
    await editor.getByRole('button', { name: '编辑 Pin Name 1', exact: true }).waitFor()
    assert.equal(await editor.locator('tbody tr').count(), 2)
    const original = await state()
    assert.equal(original.dirty, false)
    assert.deepEqual((await editor.locator('thead th').allTextContents()).map(value => value.trim()), ['', '#', 'Group Name', 'Pin Name', 'Type', 'Comment', '操作'])

    // Escape discards drafts and Enter commits exactly to the selected source row.
    await editor.getByRole('button', { name: '编辑 Pin Name 1', exact: true }).click()
    await editor.getByRole('textbox', { name: 'Pin Name 1', exact: true }).fill('cancelled')
    await page.keyboard.press('Escape')
    assert.equal((await state()).dirty, false)
    await editor.getByRole('button', { name: '编辑 Pin Name 1', exact: true }).focus()
    await page.keyboard.press('Enter')
    await editor.getByRole('textbox', { name: 'Pin Name 1', exact: true }).fill('A1')
    await page.keyboard.press('Enter')
    assert.equal((await state()).data.individualPins[0].pinName, 'A1')
    assert.equal((await state()).dirty, true)
    await page.locator('.workbench-dock-tab').filter({ hasText: 'pinmap' }).locator('.dock-tab-dirty').waitFor()

    await editor.getByRole('button', { name: '编辑 Group Name 2', exact: true }).click()
    await editor.getByRole('textbox', { name: 'Group Name 2', exact: true }).fill('DATA')
    await editor.getByRole('textbox', { name: '搜索管脚' }).click()
    assert.equal((await state()).data.pinGroups[0].groupName, 'DATA')
    await editor.getByRole('button', { name: '编辑 Type 2', exact: true }).click()
    await page.locator('.n-base-select-option').filter({ hasText: /^Output$/ }).click()
    assert.equal((await state()).data.pinGroups[0].type, 'Output')

    await editor.getByRole('textbox', { name: '搜索管脚' }).fill('DATA')
    assert.equal(await editor.locator('tbody tr').count(), 1)
    await editor.getByRole('button', { name: '编辑 Comment 2', exact: true }).click()
    await editor.getByRole('textbox', { name: 'Comment 2', exact: true }).fill('group-comment')
    await page.keyboard.press('Enter')
    assert.equal((await state()).data.pinGroups[0].comment, 'group-comment')
    assert.equal((await state()).data.individualPins[0].comment, original.data.individualPins[0].comment)
    await editor.getByRole('textbox', { name: '搜索管脚' }).fill('')
    assert.deepEqual((await state()).data.metadata, original.data.metadata)
    await page.screenshot({ path: '/tmp/pin-table-edit.png', animations: 'disabled' })

    // Shared header controls and native select-all work with both source arrays.
    await editor.getByRole('button', { name: '新增', exact: true }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: '新增管脚' })
    await dialog.getByRole('textbox', { name: '新增 Pin Name', exact: true }).fill('NEW0')
    await dialog.getByRole('button', { name: '添加', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await state()).data.individualPins.length, 2)
    await editor.getByRole('textbox', { name: '搜索管脚' }).fill('NEW0')
    await editor.getByRole('button', { name: '删除', exact: true }).click()
    await page.locator('.n-popconfirm__action button').last().click()
    assert.equal((await state()).data.individualPins.length, 1)
    assert.equal((await state()).data.pinGroups.length, 1)
    await editor.getByRole('textbox', { name: '搜索管脚' }).fill('')
    await editor.getByRole('button', { name: '列设置', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Comment', exact: true }).click()
    await editor.getByRole('textbox', { name: '搜索管脚' }).click()
    assert.equal(await editor.getByRole('columnheader', { name: 'Comment', exact: true }).count(), 0)
    await editor.getByRole('button', { name: '列设置', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Comment', exact: true }).click()
    await editor.getByRole('textbox', { name: '搜索管脚' }).click()
    await editor.getByRole('button', { name: '刷新', exact: true }).click()
    assert.equal((await state()).data.individualPins[0].pinName, 'A1')

    // The workbench keeps optional column insertion disabled by default.
    // Mount the same editor with its explicit opt-in to exercise column operations.
    await page.evaluate(async () => {
      const { createApp, h } = await import('/node_modules/.vite/deps/vue.js')
      const { default: PinTableEditor } = await import('/src/views/workbench/components/business/pin-map/PinTableEditor.vue')
      const { useTpStore } = await import('/src/store/modules/tp/index.ts')
      const store = useTpStore()
      const index = store.rawJson.definitions.findIndex(file => file.type === 'pinmap')
      const host = document.createElement('div')
      host.id = 'configured-pin-editor'
      Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '1000', overflow: 'auto', background: 'white' })
      document.body.append(host)
      createApp({ render: () => h(PinTableEditor, {
        data: store.rawJson.definitions[index].content,
        dataPath: ['definitions', index, 'content'],
        tableConfig: { allowAddColumn: true },
      }) }).mount(host)
    })
    editor = page.locator('#configured-pin-editor .pin-table-editor')

    // Right-click insertion starts direct header editing, on either side.
    await editor.getByRole('button', { name: '选中列 Pin Name', exact: true }).click({ button: 'right' })
    await page.getByText('右侧插入列', { exact: true }).click()
    await editor.getByRole('textbox', { name: '列名称', exact: true }).fill('Voltage')
    await page.keyboard.press('Enter')
    assert.deepEqual((await editor.locator('thead th').allTextContents()).map(value => value.trim()), ['', '#', 'Group Name', 'Pin Name', 'Voltage', 'Type', 'Comment', '操作'])
    assert.equal((await state()).data.individualPins[0].custom_1, '')
    assert.equal((await state()).data.pinGroups[0].custom_1, '')
    await editor.getByRole('button', { name: '编辑 Voltage 1', exact: true }).click()
    await editor.getByRole('textbox', { name: 'Voltage 1', exact: true }).fill('1.25')
    await page.keyboard.press('Enter')
    assert.equal((await state()).data.individualPins[0].custom_1, '1.25')
    await editor.getByRole('button', { name: '选中列 Pin Name', exact: true }).focus()
    await page.keyboard.press('Shift+F10')
    await page.getByText('左侧插入列', { exact: true }).click()
    await editor.getByRole('textbox', { name: '列名称', exact: true }).fill('Discard name')
    await page.keyboard.press('Escape')
    await editor.getByRole('button', { name: '选中列 新列2', exact: true }).waitFor()
    assert.deepEqual((await state()).data.metadata.tableColumns.map(column => column.key), ['groupName', 'custom_2', 'pinName', 'custom_1', 'type', 'comment'])
    await editor.getByRole('button', { name: '选中列 新列2', exact: true }).click({ button: 'right' })
    await page.getByText('重命名列', { exact: true }).click()
    await editor.getByRole('textbox', { name: '列名称', exact: true }).fill('Note')
    await page.keyboard.press('Enter')
    assert.equal((await state()).data.metadata.tableColumns[1].key, 'custom_2')
    assert.equal((await state()).data.metadata.tableColumns[1].title, 'Note')

    for (const scheme of ['light', 'dark']) {
      for (const size of [12, 14, 18]) {
        await page.evaluate(async ({ scheme, size }) => {
          const { useThemeStore } = await import('/src/store/modules/theme/index.ts')
          useThemeStore().setThemeScheme(scheme)
          useThemeStore().setFontSize(size)
        }, { scheme, size })
        await page.setViewportSize({ width: 1200, height: 800 })
        assert.equal(await editor.evaluate(el => el.scrollWidth > el.clientWidth + 1), false)
        if (size === 18)
          await page.screenshot({ path: `/tmp/pin-table-${scheme}.png`, animations: 'disabled' })
      }
    }
    // Column-setting drag order survives edits and determines insertion position.
    await page.setViewportSize({ width: 1600, height: 1000 })
    await editor.getByRole('button', { name: '列设置', exact: true }).click()
    const source = page.getByRole('checkbox', { name: 'Note', exact: true }).locator('..').locator('svg').first()
    const target = page.getByRole('checkbox', { name: 'Group Name', exact: true })
    const start = await source.boundingBox()
    const end = await target.boundingBox()
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
    await page.mouse.down()
    await page.mouse.move(end.x + 10, end.y + 2, { steps: 12 })
    await page.waitForTimeout(200)
    await page.mouse.up()
    await editor.getByRole('textbox', { name: '搜索管脚' }).click()
    const reordered = (await editor.locator('thead th').allTextContents()).map(value => value.trim())
    assert.ok(reordered.indexOf('Note') < reordered.indexOf('Group Name'))
    await editor.getByRole('button', { name: '编辑 Note 1', exact: true }).click()
    await editor.getByRole('textbox', { name: 'Note 1', exact: true }).fill('keeps-order')
    await page.keyboard.press('Enter')
    assert.deepEqual((await editor.locator('thead th').allTextContents()).map(value => value.trim()), reordered)
    await editor.getByRole('button', { name: '选中列 Note', exact: true }).click({ button: 'right' })
    await page.getByText('右侧插入列', { exact: true }).click()
    await page.keyboard.press('Enter')
    const inserted = (await editor.locator('thead th').allTextContents()).map(value => value.trim())
    assert.equal(inserted[inserted.indexOf('Note') + 1], '新列3')
    await editor.locator('thead').getByRole('checkbox').click()
    assert.equal(await editor.locator('tbody').getByRole('checkbox', { checked: true }).count(), 2)
    await editor.getByRole('button', { name: '批量删除', exact: true }).click()
    await page.locator('.n-popconfirm__action button').last().click()
    assert.deepEqual((await state()).data.individualPins, [])
    assert.deepEqual((await state()).data.pinGroups, [])
    assert.equal((await state()).data.metadata.sheetId, original.data.metadata.sheetId)
    assert.equal((await state()).data.metadata.tableColumns.length, 7)
    await editor.getByText('暂无管脚数据', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.warn('PASS pin table: actual project, inline editing, source mapping, dirty badge, add, delete, select all, batch delete, column settings, refresh and themes')
  }
  catch (error) {
    await page.screenshot({ path: '/tmp/pin-table-failure.png', animations: 'disabled' })
    console.error(errors)
    throw error
  }
  finally {
    await browser.close()
    await rm(fixture, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
