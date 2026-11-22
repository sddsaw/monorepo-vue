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
const temporary = await mkdtemp(path.join(tmpdir(), 'project-load-test-'))
after(() => rm(temporary, { recursive: true, force: true }))
const mocks = {
  '@tauri-apps/api/core': 'export const invoke = (...args) => globalThis.projectInvoke(...args)',
  '@tauri-apps/plugin-dialog': 'export const open = (...args) => globalThis.projectDialog(...args)',
  '@/plugins/tauri': 'export const isTauri = () => true',
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
    name: 'project-platform-fixture',
    setup(builder) {
      builder.onResolve({ filter: /^@/ }, ({ path: name }) => {
        if (name in mocks)
          return { path: name, namespace: 'fixture' }
      })
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ contents: mocks[name] }))
    },
  }],
})
const bundle = path.join(temporary, 'project.mjs')
await writeFile(bundle, result.outputFiles[0].text)
const { useTpStore, createPinia } = await import(pathToFileURL(bundle).href)
const program = { name: 'Native Program', part: 'part1', env: 'env1' }
let store
let writes
beforeEach(() => {
  writes = []
  globalThis.localStorage = { getItem: () => null, setItem: (...args) => writes.push(args) }
  globalThis.window = {}
  globalThis.projectDialog = async () => null
  globalThis.projectInvoke = async () => JSON.stringify(program)
  store = useTpStore(createPinia())
})

it('keeps node error locations current on load, edits, validation and project replacement', async () => {
  await store.loadFile('/errors.prx', JSON.stringify({
    testSuites: [{ name: 'DC', items: [
      { id: 'a', name: 'Same', loLimit: 2, hiLimit: 1 },
      { id: 'b', name: 'Same', loLimit: 0, hiLimit: 1 },
    ] }],
  }))
  const tree = store.treeData
  assert.equal(store.validationResult.errors.length, 1)
  assert.deepEqual(store.validationResult.issues[0].dataPath, ['testSuites', 0, 'items', 0])
  store.updateItemField(['testSuites', 0, 'items', 1], 'loLimit', 3)
  assert.equal(store.validationResult.errors.length, 2)
  store.updateItemField(['testSuites', 0, 'items', 0], 'loLimit', 0)
  assert.equal(store.validationResult.errors.length, 1)
  assert.deepEqual(store.validationResult.issues[0].dataPath, ['testSuites', 0, 'items', 1])
  store.updateItemField(['testSuites', 0, 'items', 1], 'hiLimit', 4, 'redis')
  assert.equal(store.validationResult.valid, true)
  assert.deepEqual(store.runValidation().issues, [])
  assert.equal(store.treeData, tree)
  await store.loadFile('/other.prx', JSON.stringify(program))
  assert.deepEqual(store.validationResult, { valid: true, errors: [] })
})

it('native chooser is PRX-only, cancel does not read a file or modify state', async () => {
  globalThis.projectDialog = async (options) => {
    assert.deepEqual(options.filters[0].extensions, ['prx'])
    assert.equal(options.multiple, false)
    assert.equal(options.directory, false)
    return null
  }
  globalThis.projectInvoke = () => {
    throw new Error('must not read')
  }
  assert.equal(await store.chooseAndOpenFile(), false)
  assert.equal(store.rawJson, null)
  assert.equal(store.projectBusy, false)
  assert.deepEqual(writes, [])
})

it('native read populates selected program only after successful load', async () => {
  globalThis.projectDialog = async () => '/projects/Test.PRX'
  globalThis.projectInvoke = async (command, args) => {
    assert.equal(command, 'read_file_content')
    assert.deepEqual(args, { path: '/projects/Test.PRX' })
    return JSON.stringify(program)
  }
  const pending = store.chooseAndOpenFile()
  assert.equal(store.rawJson, null)
  assert.equal(await store.chooseAndOpenFile(), false)
  assert.equal(await pending, true)
  assert.deepEqual(store.rawJson, program)
  assert.equal(store.treeData.length, 3)
  assert.equal(store.recentProjects[0].name, program.name)
  assert.equal(store.projectBusy, false)
})

it('rejects renamed extensions and invalid JSON structures without damaging the current document', async () => {
  await store.loadFile('/old.prx', JSON.stringify(program))
  const previous = store.rawJson
  const previousTree = store.treeData
  for (const content of ['', '{', 'null', '[]', '{}', '42', '{"testSuites":[null]}']) {
    assert.equal(await store.openProject({ path: '/broken.prx', read: async () => content }), false)
    assert.equal(store.rawJson, previous)
    assert.equal(store.treeData, previousTree)
    assert.equal(store.filePath, '/old.prx')
    assert.equal(store.projectLoad.status, 'error')
    store.cancelProjectLoad()
  }
  assert.equal(await store.openProject({ path: '/program.json', read: async () => JSON.stringify(program) }), false)
  assert.match(store.projectLoad.error, /\.prx/)
  assert.equal(store.rawJson, previous)
})

it('late completion of a cancelled read cannot replace a newer program or its progress', async () => {
  let completeOldRead
  const pendingOld = store.openProject({ path: '/old.prx', read: () => new Promise((resolve) => {
    completeOldRead = resolve
  }) })
  await Promise.resolve()
  store.cancelProjectLoad()
  const pendingNew = store.openProject({ path: '/new.prx', read: async () => JSON.stringify(program) })
  completeOldRead('{bad JSON')
  assert.equal(await pendingOld, false)
  assert.equal(store.projectBusy, true)
  assert.notEqual(store.projectLoad.status, 'error')
  assert.equal(await pendingNew, true)
  assert.equal(store.filePath, '/new.prx')
})

it('preserves unsaved changes when replacement confirmation is cancelled', async () => {
  await store.loadFile('/old.prx', JSON.stringify(program))
  store.updateItemField([], 'part', 'unsaved')
  window.$dialog = { warning: options => options.onNegativeClick() }
  assert.equal(await store.openProject({ path: '/next.prx', read: async () => JSON.stringify(program) }), false)
  assert.equal(store.rawJson.part, 'unsaved')
  assert.equal(store.isDirty, true)
  assert.equal(store.projectBusy, false)
})

it('accepts UTF-8 BOM and retains false/zero/null values in the tree', async () => {
  await store.loadFile('/bom.prx', `\uFEFF${JSON.stringify({ enabled: false, count: 0, optional: null })}`)
  assert.deepEqual(store.treeData.map(node => node.label), ['enabled: false', 'count: 0', 'optional: null'])
  assert.deepEqual(store.treeData.map(node => node.componentKey), ['ProjectData', 'ProjectData', 'ProjectData'])
})
