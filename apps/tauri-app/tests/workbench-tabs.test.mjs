/* eslint-disable test/no-import-node-test -- 使用项目现有的 Node 内置测试运行器。 */
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, beforeEach, it } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild')
const appRoot = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(path.join(tmpdir(), 'workbench-tabs-test-'))
after(() => rm(temporary, { recursive: true, force: true }))
const mocks = {
  '@tauri-apps/api/core': 'export const invoke = (...args) => globalThis.tpInvoke(...args)',
  '@tauri-apps/plugin-dialog': 'export const open = async () => null',
  '@/plugins/tauri': 'export const isTauri = () => globalThis.tpNative',
  '@/core/adapterManager': 'export const resolveAdapter = () => ({ buildTree: () => [] })',
}
const result = await build({
  stdin: {
    contents: `export * from './src/store/modules/tp/index.ts'; export { createPinia } from 'pinia';`,
    resolveDir: appRoot,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  plugins: [{
    name: 'workbench-platform-fixture',
    setup(builder) {
      builder.onResolve({ filter: /^@/ }, ({ path: name }) => {
        if (name in mocks)
          return { path: name, namespace: 'fixture' }
        if (name === '@/enum')
          return { path: path.join(appRoot, 'src/enum/index.ts') }
      })
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ contents: mocks[name] }))
    },
  }],
})
const bundle = path.join(temporary, 'tabs.mjs')
await writeFile(bundle, result.outputFiles[0].text)
const { useTpStore, createPinia } = await import(pathToFileURL(bundle).href)

let store
beforeEach(() => {
  globalThis.tpNative = true
  globalThis.tpInvoke = async () => {}
  globalThis.window = { $message: { warning() {}, error() {} } }
  globalThis.localStorage = { getItem: () => null }
  store = useTpStore(createPinia())
  store.rawJson = { items: [{ name: 'left', pin: { type: 'input' } }, { name: 'right' }] }
  store.tabs = [
    { id: 'left', label: 'left', dataPath: ['items', 0], componentKey: 'Continuity' },
    { id: 'right', label: 'right', dataPath: ['items', 1], componentKey: 'Continuity' },
  ]
  store.setActiveTab('right')
  store.filePath = '/workspace/test.json'
})

it('iframe tabs are independent of project dirty state and reuse their existing panel', () => {
  const options = { id: 'demo', title: 'Iframe Demo', src: '/iframe-demo/index.html' }
  store.openIframeTab(options)
  store.openIframeTab(options)
  assert.equal(store.tabs.filter(tab => tab.id === 'iframe:demo').length, 1)
  assert.equal(store.activeTabId, 'iframe:demo')
  store.updateItemField(['items', 0], 'name', 'changed')
  assert.equal(store.tabs.find(tab => tab.id === 'iframe:demo').isDirty, false)
  assert.equal(store.tabs.find(tab => tab.id === 'iframe:demo').iframeSrc, options.src)
})

it('editing an inactive split marks the edited tab and preserves the other item', () => {
  store.updateItemField(['items', 0], 'name', 'changed')
  assert.equal(store.tabs[0].isDirty, true)
  assert.equal(Boolean(store.tabs[1].isDirty), false)
  assert.equal(store.rawJson.items[0].name, 'changed')
  assert.equal(store.rawJson.items[1].name, 'right')
  assert.equal(store.activeTabId, 'right')
  assert.equal(store.fileDirty, true)
})

it('editing a nested table field marks its containing tab', () => {
  store.updateItemField(['items', 0, 'pin'], 'type', 'output')
  assert.equal(store.tabs[0].isDirty, true)
  assert.equal(Boolean(store.tabs[1].isDirty), false)
})

it('marks all containing views without marking settings', () => {
  store.tabs.push(
    { id: 'summary', label: 'summary', dataPath: ['items'], componentKey: 'SuiteSummary' },
    { id: 'settings', label: 'settings', dataPath: [], componentKey: 'SettingsView' },
  )
  store.updateItemField(['items', 0], 'name', 'changed')
  assert.deepEqual(store.tabs.map(tab => Boolean(tab.isDirty)), [true, false, true, false])
})

it('external updates do not mark user edits', () => {
  store.updateItemField(['items', 0], 'name', 'external', 'redis')
  assert.equal(store.rawJson.items[0].name, 'external')
  assert.equal(store.isDirty, false)
})

it('keeps the indicator when editing back to the original value or switching tabs', () => {
  store.updateItemField(['items', 0], 'name', 'changed')
  store.updateItemField(['items', 0], 'name', 'left')
  store.setActiveTab('left')
  store.setActiveTab('right')
  assert.equal(store.tabs[0].isDirty, true)
})

it('restores the indicator after closing and reopening an unsaved tab', () => {
  store.updateItemField(['items', 0], 'name', 'changed')
  store.closeTab('left')
  store.openTab({ id: 'left', label: 'left', nodeType: 'file', dataPath: ['items', 0], componentKey: 'Continuity' })
  assert.equal(store.tabs.find(tab => tab.id === 'left').isDirty, true)
  assert.equal(store.fileDirty, true)
})

it('marks descendant views when their containing data is replaced', () => {
  store.updateItemField([], 'items', [{ name: 'new left' }, { name: 'new right' }])
  assert.deepEqual(store.tabs.map(tab => tab.isDirty), [true, true])
})

it('clears saved changes only after a successful native write', async () => {
  store.updateItemField(['items', 0], 'name', 'changed')
  let finishWrite
  globalThis.tpInvoke = async (command, { path, content }) => {
    assert.equal(command, 'save_file_content')
    assert.equal(path, '/workspace/test.json')
    assert.equal(JSON.parse(content).items[0].name, 'changed')
    await new Promise(resolve => finishWrite = resolve)
  }
  const save = store.saveFile()
  await Promise.resolve()
  assert.equal(store.tabs[0].isDirty, true)
  finishWrite()
  assert.equal(await save, true)
  assert.equal(store.isDirty, false)
  assert.deepEqual(store.tabs.map(tab => tab.isDirty), [false, false])
})

it('preserves indicators after a write failure and supports retry', async () => {
  store.updateItemField(['items', 0], 'name', 'changed')
  globalThis.tpInvoke = async () => {
    throw new Error('disk full')
  }
  assert.equal(await store.saveFile(), false)
  assert.equal(store.tabs[0].isDirty, true)
  assert.equal(store.fileDirty, true)
  globalThis.tpInvoke = async () => {}
  assert.equal(await store.saveFile(), true)
  assert.equal(store.isDirty, false)
})

it('retains edits made during a pending save, including edits to the same field', async () => {
  store.updateItemField(['items', 0], 'name', 'snapshot')
  store.updateItemField(['items', 1], 'name', 'saved right')
  let finishWrite
  globalThis.tpInvoke = () => new Promise(resolve => finishWrite = resolve)
  const save = store.saveFile()
  await Promise.resolve()
  store.updateItemField(['items', 0], 'name', 'newer left')
  finishWrite()
  await save
  assert.deepEqual(store.tabs.map(tab => tab.isDirty), [true, false])
  assert.equal(store.fileDirty, true)
})

it('serializes repeated saves so the latest contents are written last', async () => {
  const writes = []
  let finishWrite
  globalThis.tpInvoke = async (_command, { content }) => {
    writes.push(JSON.parse(content).items[0].name)
    if (writes.length === 1)
      await new Promise(resolve => finishWrite = resolve)
  }
  store.updateItemField(['items', 0], 'name', 'first')
  const first = store.saveFile()
  await Promise.resolve()
  store.updateItemField(['items', 0], 'name', 'second')
  const second = store.saveFile()
  assert.deepEqual(writes, ['first'])
  finishWrite()
  await Promise.all([first, second])
  assert.deepEqual(writes, ['first', 'second'])
  assert.equal(store.isDirty, false)
})

it('does not clear the new session when an older save completes', async () => {
  store.updateItemField(['items', 0], 'name', 'old')
  let finishWrite
  globalThis.tpInvoke = () => new Promise(resolve => finishWrite = resolve)
  const save = store.saveFile()
  await Promise.resolve()
  await store.loadFile('/workspace/test.json', JSON.stringify({ items: [{ name: 'new session' }] }))
  store.openTab({ id: 'left', label: 'left', nodeType: 'file', dataPath: ['items', 0], componentKey: 'Continuity' })
  store.updateItemField(['items', 0], 'name', 'new edit')
  finishWrite()
  await save
  assert.equal(store.tabs[0].isDirty, true)
  assert.equal(store.fileDirty, true)
})

it('does not pretend browser-only saving has written the native file', async () => {
  globalThis.tpNative = false
  store.updateItemField(['items', 0], 'name', 'changed')
  assert.equal(await store.saveFile(), false)
  assert.equal(store.tabs[0].isDirty, true)
})
