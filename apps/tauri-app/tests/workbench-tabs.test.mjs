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
  '@tauri-apps/api/core': 'export const invoke = async () => {}',
  '@tauri-apps/plugin-dialog': 'export const open = async () => null',
  '@/plugins/tauri': 'export const isTauri = () => false',
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
  globalThis.localStorage = { getItem: () => null }
  store = useTpStore(createPinia())
  store.rawJson = { items: [{ name: 'left', pin: { type: 'input' } }, { name: 'right' }] }
  store.tabs = [
    { id: 'left', label: 'left', dataPath: ['items', 0], componentKey: 'Continuity' },
    { id: 'right', label: 'right', dataPath: ['items', 1], componentKey: 'Continuity' },
  ]
  store.setActiveTab('right')
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
