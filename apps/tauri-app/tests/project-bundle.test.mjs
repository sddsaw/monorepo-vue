/* eslint-disable test/no-import-node-test -- 使用 Node 内置测试运行器。 */
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, it } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild')
const app = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(path.join(tmpdir(), 'prx-bundle-'))
after(() => rm(temp, { recursive: true, force: true }))
const result = await build({
  stdin: { contents: 'export * from \'./src/core/project-bundle.ts\'; export * from \'./src/store/modules/tp/index.ts\'; export { createPinia } from \'pinia\';', resolveDir: app },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  define: { 'import.meta.env.VITE_VALIDATE_PROJECT_REFERENCES': 'globalThis.projectReferenceValidation' },
  plugins: [{ name: 'platform', setup(builder) {
    const mocks = {
      '@tauri-apps/api/core': 'export const invoke = (...args) => globalThis.prxInvoke(...args)',
      '@tauri-apps/plugin-dialog': 'export const open = async () => null',
      '@/plugins/tauri': 'export const isTauri = () => true',
    }
    builder.onResolve({ filter: /^@/ }, ({ path: name }) => name in mocks ? { path: name, namespace: 'fixture' } : undefined)
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ contents: mocks[name] }))
  } }],
})
await writeFile(path.join(temp, 'test.mjs'), result.outputFiles[0].text)
const { prepareProjectBundle, useTpStore, createPinia } = await import(pathToFileURL(path.join(temp, 'test.mjs')).href)
globalThis.projectReferenceValidation = 'true'
const config = {
  records: [
    { slot: 1, type: 'SiteAssembly', subslots: 6 },
    { slot: 2, type: 'SiteAssembly', subslots: 4 },
    { slot: 3, type: 'RepeaterBoard', subslots: 0 },
    { slot: 4, type: 'SiteAssembly', subslots: 4 },
  ],
  subslotModules: ['SCU', 'ABMB', 'MIO16', 'MIO16', 'MVS1A', 'MVS1A'].map((moduleType, subSlot) => ({ slot: 1, subSlot, moduleType })),
}
const definitionTypes = {
  pinmap: { DefFileType: 'pinmap', individualPins: [{ pinName: 'A0' }], pinGroups: [{ groupName: 'DQ' }] },
  channelmap: { DefFileType: 'channelmap', data: [{ pinName: 'A0', site_0: '2.ch0' }] },
  flowtable: { DefFileType: 'flowtable', data: [] },
  testinstance: { DefFileType: 'testinstance', data: [] },
  pinlevels: { DefFileType: 'pinlevels', data: [] },
  timesetsbasic: { DefFileType: 'mtstimeset', data: [] },
  pinscramble: { DefFileType: 'pinscrambletable', data: [] },
  patternset: { DefFileType: 'patternset', data: [{ patternSet: 'phase1', filePath: 'DefFiles/raw_pattern.pat' }] },
  globalspec: { DefFileType: 'globalspec', data: [] },
  joblist: { DefFileType: 'joblist', jobs: [{ jobName: 'JobTest' }] },
}
function fixture() {
  return {
    manifest: JSON.stringify({ name: 'Prox.prx', configFile: 'SimulatedConfig.json', DefFileFolder: 'DefFiles' }),
    configuration: { path: 'SimulatedConfig.json', content: JSON.stringify(config) },
    definitions: Object.entries(definitionTypes).map(([name, data]) => ({ path: `DefFiles/${name}.json`, content: JSON.stringify(data) })),
    availableFiles: ['DefFiles/raw_pattern.pat'],
  }
}
function flatten(nodes) {
  return nodes.flatMap(n => [n, ...flatten(n.children ?? [])])
}

it('generates screenshot hierarchy, 10 definition nodes, 8 fillers and 2 PPMUs', () => {
  const project = prepareProjectBundle('/93k/Prox.prx', fixture())
  assert.deepEqual(project.tree.map(n => n.label), ['DUT', 'Tester', 'Test Conditions', 'Job'])
  const nodes = flatten(project.tree)
  assert.equal(nodes.filter(n => n.componentKey === 'ProjectDefinition').length, 10)
  assert.equal(nodes.filter(n => n.label.startsWith('FILLER')).length, 8)
  assert.equal(nodes.filter(n => n.label === 'PPMU').length, 2)
  assert.equal(nodes.find(n => n.label === 'SITEASSEMBLY(1)').children.length, 6)
  assert.equal(nodes.find(n => n.label === 'SITEASSEMBLY(1)').nodeType, 'file')
  assert.equal(nodes.find(n => n.label === 'Characterization').children.length, 0)
  assert.equal(nodes.find(n => n.label === 'Characterization').isLeaf, true)
  assert.equal(nodes.find(n => n.label === 'PPMU').isLeaf, true)
  assert.equal(nodes.find(n => n.label === 'SITEASSEMBLY(1)').isLeaf, false)
  assert.equal(nodes.find(n => n.label === 'PatternTool (External)').disabled, true)
  assert.equal(project.documents.length, 12)
  assert.deepEqual(project.warnings, [])
})

it('keeps multiple files of the same type with unique source paths', () => {
  const bundle = fixture()
  bundle.definitions.push({ ...bundle.definitions[0], path: 'DefFiles/sub/another.json' })
  const project = prepareProjectBundle('/93k/Prox.prx', bundle)
  const files = project.tree[0].children[0].children
  assert.equal(files.length, 2)
  assert.notEqual(files[0].id, files[1].id)
})

it('validates declared slot counts, duplicates, JSON and definition structure', () => {
  const invalid = structuredClone(config)
  invalid.records[0].subslots = 4
  const bundle = fixture()
  bundle.configuration.content = JSON.stringify(invalid)
  assert.throws(() => prepareProjectBundle('/93k/Prox.prx', bundle), /subslots/)
  bundle.configuration.content = JSON.stringify({ ...config, subslotModules: [...config.subslotModules, config.subslotModules[0]] })
  assert.throws(() => prepareProjectBundle('/93k/Prox.prx', bundle), /重复/)
  bundle.configuration.content = '{broken'
  assert.throws(() => prepareProjectBundle('/93k/Prox.prx', bundle), /SimulatedConfig.json/)
  const malformed = fixture()
  malformed.definitions[0].content = JSON.stringify({ DefFileType: 'pinmap', individualPins: null })
  assert.throws(() => prepareProjectBundle('/93k/Prox.prx', malformed), /individualPins/)
})

it('rejects traversal and files outside the definition directory', () => {
  const bundle = fixture()
  bundle.definitions[0].path = '../outside.json'
  assert.throws(() => prepareProjectBundle('/93k/Prox.prx', bundle), /内部相对路径/)
  bundle.definitions[0].path = 'Other/pinmap.json'
  assert.throws(() => prepareProjectBundle('/93k/Prox.prx', bundle), /定义目录/)
})

it('recognizes an existing referenced pattern without reading its contents', () => {
  const bundle = fixture()
  bundle.availableFiles = ['DefFiles/raw_pattern.pat']
  assert.deepEqual(prepareProjectBundle('/93k/Prox.prx', bundle).warnings, [])
})

it('skips reference checks when disabled or unset but still validates configuration', () => {
  const bundle = fixture()
  bundle.availableFiles = []
  try {
    for (const value of ['false', undefined]) {
      globalThis.projectReferenceValidation = value
      assert.equal(prepareProjectBundle('/93k/Prox.prx', bundle).documents.length, 12)
    }
    bundle.configuration.content = '{broken'
    assert.throws(() => prepareProjectBundle('/93k/Prox.prx', bundle), /SimulatedConfig.json/)
  }
  finally {
    globalThis.projectReferenceValidation = 'true'
  }
})

it('rejects all missing referenced files before building the hardware tree', () => {
  const bundle = fixture()
  bundle.availableFiles = []
  bundle.configuration.content = '{invalid hardware JSON'
  bundle.definitions.find(f => f.path.endsWith('/joblist.json')).content = JSON.stringify({
    DefFileType: 'joblist',
    testProgramPath: 'TestProgram/TestProgram.csproj',
    jobs: [{ pinMap: 'pinmap', chanMap: 'DefFiles/missing-channelmap.json', acSpecs: '' }],
  })
  assert.throws(() => prepareProjectBundle('/93k/Prox.prx', bundle), (error) => {
    assert.match(error.message, /raw_pattern.pat/)
    assert.match(error.message, /TestProgram\/TestProgram.csproj/)
    assert.match(error.message, /missing-channelmap.json/)
    assert.doesNotMatch(error.message, /硬件|pinmap.json/)
    return true
  })
})

it('never starts Load or replaces the current project when preflight fails', async () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} }
  const store = useTpStore(createPinia())
  await store.loadFile('/old.prx', '{"name":"Old"}')
  const oldData = store.rawJson
  const oldTree = store.treeData
  const history = JSON.stringify(store.recentProjects)
  const bundle = fixture()
  bundle.availableFiles = []
  let resolveBundle
  const pending = store.openProject({
    path: '/93k/Prox.prx',
    read: async () => bundle.manifest,
    readBundle: () => new Promise((resolve) => { resolveBundle = resolve }),
  })
  for (let i = 0; i < 5; i++) await Promise.resolve()
  assert.equal(store.projectLoad.status, 'checking')
  assert.equal(store.projectLoad.progress, 0)
  resolveBundle(bundle)
  assert.equal(await pending, false)
  assert.equal(store.projectLoad.progress, 0)
  assert.equal(store.projectLoad.stage, '文件检查未通过')
  assert.match(store.projectLoad.error, /raw_pattern.pat/)
  assert.equal(store.rawJson, oldData)
  assert.equal(store.treeData, oldTree)
  assert.equal(JSON.stringify(store.recentProjects), history)
})

it('reads the actual user fixture when PRX_FIXTURE is set', async () => {
  if (!process.env.PRX_FIXTURE)
    return
  const root = path.dirname(process.env.PRX_FIXTURE)
  const files = await readdir(path.join(root, 'DefFiles'))
  const bundle = {
    manifest: await readFile(process.env.PRX_FIXTURE, 'utf8'),
    configuration: { path: 'SimulatedConfig.json', content: await readFile(path.join(root, 'SimulatedConfig.json'), 'utf8') },
    definitions: await Promise.all(files.filter(f => f.endsWith('.json')).map(async file => ({ path: `DefFiles/${file}`, content: await readFile(path.join(root, 'DefFiles', file), 'utf8') }))),
    availableFiles: files.map(f => `DefFiles/${f}`),
  }
  assert.throws(() => prepareProjectBundle(process.env.PRX_FIXTURE, bundle), /raw_pattern.pat/)
})

it('native load and source-aware save never write aggregate data into the PRX', async () => {
  const bundle = fixture()
  bundle.projectPath = '/canonical/93k/Prox.prx'
  const calls = []
  globalThis.localStorage = { getItem: () => null, setItem: () => {} }
  globalThis.window = { $message: { error: (message) => {
    throw new Error(message)
  } } }
  globalThis.prxInvoke = async (command, args) => {
    calls.push({ command, args })
    if (command === 'read_file_content')
      return bundle.manifest
    if (command === 'read_project_bundle')
      return bundle
    return undefined
  }
  const store = useTpStore(createPinia())
  await store.loadFile('/93k/Prox.prx')
  assert.equal(store.filePath, '/canonical/93k/Prox.prx')
  assert.equal(store.treeData.length, 4)
  assert.equal(await store.saveFile(), true)
  assert.equal(calls.filter(c => c.command === 'save_file_content').length, 0)
  store.updateItemField(['definitions', 0, 'content', 'individualPins', 0], 'pinName', 'A9')
  store.updateItemField(['manifest'], 'part', 'part2')
  assert.equal(await store.saveFile(), true)
  const saves = calls.filter(c => c.command === 'save_file_content')
  assert.equal(saves.length, 2)
  assert.deepEqual(saves.map(s => s.args.path).sort(), ['/canonical/93k/DefFiles/pinmap.json', '/canonical/93k/Prox.prx'])
  assert.equal(JSON.parse(saves.find(s => s.args.path.endsWith('pinmap.json')).args.content).individualPins[0].pinName, 'A9')
  const manifest = JSON.parse(saves.find(s => s.args.path.endsWith('Prox.prx')).args.content)
  assert.equal(manifest.part, 'part2')
  assert.equal(manifest.definitions, undefined)
  assert.equal(manifest.configuration, undefined)
  assert.equal(store.isDirty, false)
})
