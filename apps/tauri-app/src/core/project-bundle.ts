import type { PreparedProject } from './project-loader'
import type { TPTreeNode } from './tpModule'
import { projectGroupIcons, projectHardwareIcon } from './project-icons'

export interface ProjectTextFile { path: string, content: string }
export interface ProjectBundle {
  projectPath?: string
  manifest: string
  configuration: ProjectTextFile
  definitions: ProjectTextFile[]
  availableFiles: string[]
}
export interface ProjectDocument { path: string, dataPath: (string | number)[] }
type JsonObject = Record<string, unknown>

export function parseObject(content: string, file: string): JsonObject {
  let data: unknown
  try {
    data = JSON.parse(content.replace(/^\uFEFF/, ''))
  }
  catch { throw new Error(`${file} 不是有效的 JSON`) }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error(`${file} 必须是 JSON 对象`)
  return data as JsonObject
}

export function normalizeProjectPath(path: string) {
  const normalized = path.replace(/\\/g, '/')
  if (!normalized || normalized.startsWith('/') || normalized.includes(':') || normalized.split('/').includes('..'))
    throw new Error(`工程引用必须是内部相对路径：${path}`)
  return normalized.split('/').filter(p => p && p !== '.').join('/')
}

function objectRows(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row)))
    throw new Error(`${label} 必须是对象数组`)
  return value as JsonObject[]
}
function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1024)
    throw new Error(`${label} 必须是 0～1024 的整数`)
  return value
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} 不能为空`)
  return value.trim()
}

const definitionGroups: Record<string, { groups: string[], arrays: string[], title: string }> = {
  pinmap: { groups: ['DUT', 'Pin Table'], arrays: ['individualPins', 'pinGroups'], title: 'Pin Table' },
  channelmap: { groups: ['Tester', 'Channel Map'], arrays: ['data'], title: 'Channel Map' },
  flowtable: { groups: ['Test Conditions', 'Flow'], arrays: ['data'], title: 'Flow' },
  testinstance: { groups: ['Test Conditions', 'Test Instances'], arrays: ['data'], title: 'Test Instances' },
  pinlevels: { groups: ['Test Conditions', 'Level and Timing', 'Levels'], arrays: ['data'], title: 'Levels' },
  mtstimeset: { groups: ['Test Conditions', 'Level and Timing', 'Timing'], arrays: ['data'], title: 'Timing' },
  pinscrambletable: { groups: ['Test Conditions', 'Pin Scramble'], arrays: ['data'], title: 'Pin Scramble' },
  patternset: { groups: ['Test Conditions', 'Patterns', 'Pattern Sets'], arrays: ['data'], title: 'Pattern Sets' },
  globalspec: { groups: ['Test Conditions', 'Specs', 'Global Specs'], arrays: ['data'], title: 'Global Specs' },
  dcspec: { groups: ['Test Conditions', 'Specs', 'DC Specs'], arrays: ['data'], title: 'DC Specs' },
  acspec: { groups: ['Test Conditions', 'Specs', 'AC Specs'], arrays: ['data'], title: 'AC Specs' },
  characterization: { groups: ['Test Conditions', 'Characterization'], arrays: ['data'], title: 'Characterization' },
  joblist: { groups: ['Job', 'Job Composer'], arrays: ['jobs'], title: 'Job Composer' },
}

/**
 * 只检查明确声明的文件引用；空的可选 Job 字段不要求提供文件。
 * TODO: 从 .prx 入口按各文件格式的引用字段递归检查依赖，记录引用链并处理循环引用。
 * 当前仅检查已知字段指向的文件是否存在，尚未解析 .csproj、.pat 等文件内部的依赖；
 * 后续需明确不支持解析的格式边界，避免把普通字符串误判为路径。
 */
function assertReferencedFiles(
  definitions: { path: string, data: JsonObject }[],
  available: Set<string>,
  definitionFolder: string,
) {
  const missing = new Map<string, Set<string>>()
  const check = (value: unknown, source: string, namedDefinition = false) => {
    if (typeof value !== 'string' || !value.trim())
      return
    const name = value.trim()
    const reference = normalizeProjectPath(namedDefinition && !/[\\/.]/.test(name) ? `${definitionFolder}/${name}.json` : name)
    if (!available.has(reference)) {
      if (!missing.has(reference))
        missing.set(reference, new Set())
      missing.get(reference)!.add(source)
    }
  }
  for (const { path, data } of definitions) {
    const type = typeof data.DefFileType === 'string' ? data.DefFileType.trim().toLowerCase() : ''
    if (type === 'patternset') {
      for (const row of objectRows(data.data, `${path}: data`)) check(row.filePath, path)
    }
    if (type === 'joblist') {
      check(data.testProgramPath, path)
      for (const job of objectRows(data.jobs, `${path}: jobs`)) {
        for (const key of ['pinMap', 'chanMap', 'testInstances', 'flowTable', 'acSpecs', 'dcSpecs', 'patternSets', 'patternGroups', 'binTable', 'characterization', 'testProcedures'])
          check(job[key], path, true)
      }
    }
  }
  if (missing.size)
    throw new Error(`关联文件缺失，未开始 Load：\n${[...missing].map(([path, sources]) => `${path}（引用来源：${[...sources].join('、')}）`).join('\n')}`)
}

/** 工程聚合数据与来源分开保存，来源路径不会混入原始定义 JSON。 */
export function prepareProjectBundle(path: string, bundle: ProjectBundle): PreparedProject {
  path = bundle.projectPath ?? path
  const manifest = parseObject(bundle.manifest, path)
  const configPath = normalizeProjectPath(text(manifest.configFile, 'configFile'))
  const definitionFolder = normalizeProjectPath(text(manifest.DefFileFolder, 'DefFileFolder'))
  if (normalizeProjectPath(bundle.configuration.path) !== configPath)
    throw new Error('加载的硬件配置与工程入口不一致')
  if (!bundle.definitions.length)
    throw new Error(`定义目录没有 JSON 文件：${definitionFolder}`)
  const parsedDefinitions = bundle.definitions.map(file => ({ path: normalizeProjectPath(file.path), data: parseObject(file.content, file.path) }))
  if (import.meta.env?.VITE_VALIDATE_PROJECT_REFERENCES === 'true') {
    const available = new Set([...bundle.availableFiles, ...parsedDefinitions.map(file => file.path), configPath].map(normalizeProjectPath))
    assertReferencedFiles(parsedDefinitions, available, definitionFolder)
  }
  const config = parseObject(bundle.configuration.content, configPath)
  const records = objectRows(config.records, `${configPath}: records`)
  const modules = objectRows(config.subslotModules, `${configPath}: subslotModules`)
  const tree: TPTreeNode[] = []
  const warnings: string[] = []
  const documents: ProjectDocument[] = [
    { path: path.replace(/\\/g, '/').split('/').pop()!, dataPath: ['manifest'] },
    { path: configPath, dataPath: ['configuration'] },
  ]
  const group = (labels: string[]): TPTreeNode => {
    let children = tree
    let current!: TPTreeNode
    for (let i = 0; i < labels.length; i++) {
      const id = `group:${labels.slice(0, i + 1).join('/')}`
      current = children.find(n => n.id === id)!
      if (!current) {
        current = { id, label: labels[i], nodeType: 'folder', children: [], icon: projectGroupIcons[labels[i]] ?? 'ri:folder-line' }
        children.push(current)
      }
      children = current.children!
    }
    return current
  }
  // 菜单次序属于产品结构，数据叶子来自工程文件。
  for (const labels of [
    ['DUT', 'Pin Table'],
    ['Tester', 'Channel Map'],
    ['Tester', 'Instruments'],
    ['Test Conditions', 'Flow'],
    ['Test Conditions', 'Test Instances'],
    ['Test Conditions', 'Level and Timing', 'Levels'],
    ['Test Conditions', 'Level and Timing', 'Timing'],
    ['Test Conditions', 'Pin Scramble'],
    ['Test Conditions', 'Patterns', 'Pattern Sets'],
    ['Test Conditions', 'Specs', 'Global Specs'],
    ['Test Conditions', 'Specs', 'DC Specs'],
    ['Test Conditions', 'Specs', 'AC Specs'],
    ['Test Conditions', 'Characterization'],
    ['Job', 'Job Composer'],
  ]) group(labels)

  const hardware: JsonObject[] = []
  const hardwareNode = (id: string, label: string, data: JsonObject, note = ''): TPTreeNode => {
    const index = hardware.push({ label, source: configPath, note, values: data }) - 1
    return { id, label, nodeType: 'file', componentKey: 'ProjectHardware', dataPath: ['hardware', index], icon: projectHardwareIcon(String(data.function ?? data.moduleType ?? data.type ?? '')), children: [] }
  }
  const slots = new Set<number>()
  const moduleKeys = new Set<string>()
  for (const record of records) {
    const slot = integer(record.slot, 'slot')
    if (slots.has(slot))
      throw new Error(`重复的主槽位：${slot}`)
    slots.add(slot)
    const count = integer(record.subslots, `slot ${slot}: subslots`)
    const type = text(record.type, `slot ${slot}: type`).toUpperCase()
    const parent = hardwareNode(`slot:${slot}`, `${type}(${slot})`, record)
    const children = modules.filter(m => m.slot === slot)
    for (let subSlot = 0; subSlot < count; subSlot++) {
      const matches = children.filter(m => m.subSlot === subSlot)
      if (matches.length > 1)
        throw new Error(`重复的子槽位：${slot}.${subSlot}`)
      const module = matches[0]
      const moduleType = module ? text(module.moduleType, 'moduleType').toUpperCase() : 'FILLER'
      const child = hardwareNode(`module:${slot}:${subSlot}`, `${moduleType}(${subSlot})`, module ?? { slot, subSlot, moduleType: 'FILLER' }, module ? '' : '此子槽位未配置模块')
      if (moduleType === 'MIO16') {
        child.children!.push(hardwareNode(`ppmu:${slot}:${subSlot}`, 'PPMU', { slot, subSlot, moduleType, function: 'PPMU' }, 'MIO16 的 PPMU 功能入口；尚未连接真实硬件'))
      }
      parent.children!.push(child)
    }
    group(['Tester', 'Instruments']).children!.push(parent)
  }
  for (const module of modules) {
    const slot = integer(module.slot, 'module.slot')
    const subSlot = integer(module.subSlot, 'module.subSlot')
    const parent = records.find(r => r.slot === slot)
    if (!parent || subSlot >= Number(parent.subslots))
      throw new Error(`模块 ${slot}.${subSlot} 超出主槽位定义，请修正 subslots`)
    const key = `${slot}.${subSlot}`
    if (moduleKeys.has(key))
      throw new Error(`重复的子槽位：${key}`)
    moduleKeys.add(key)
  }
  const seen = new Set<string>(documents.map(d => d.path))
  const definitions = parsedDefinitions.map((file, index) => {
    const filePath = normalizeProjectPath(file.path)
    if (!filePath.startsWith(`${definitionFolder}/`) || !/\.json$/i.test(filePath) || seen.has(filePath))
      throw new Error(`定义文件路径重复或不在定义目录内：${filePath}`)
    seen.add(filePath)
    const data = file.data
    const type = text(data.DefFileType, `${filePath}: DefFileType`).toLowerCase()
    const schema = definitionGroups[type]
    const fileWarnings: string[] = []
    if (schema) {
      for (const key of schema.arrays) objectRows(data[key], `${filePath}: ${key}`)
    }
    else {
      fileWarnings.push(`未识别的定义类型 ${type}，以原始数据展示`)
    }
    warnings.push(...fileWarnings.map(w => `${filePath}：${w}`))
    documents.push({ path: filePath, dataPath: ['definitions', index, 'content'] })
    group(schema?.groups ?? ['Other Definitions']).children!.push({
      id: `definition:${filePath}`,
      label: filePath.split('/').pop()!.replace(/\.json$/i, ''),
      nodeType: 'file',
      icon: projectGroupIcons[schema?.groups.at(-1) ?? ''] ?? 'lucide:file-json',
      componentKey: type === 'pinmap' ? 'PinTable' : 'ProjectDefinition',
      dataPath: type === 'pinmap' ? ['definitions', index, 'content'] : ['definitions', index],
    })
    return { path: filePath, title: schema?.title ?? type, type, warnings: fileWarnings, content: data }
  })
  group(['Test Conditions', 'Patterns']).children!.push({
    id: 'pattern-tool',
    label: 'PatternTool (External)',
    nodeType: 'file',
    icon: 'lucide:external-link',
    disabled: true,
    description: '尚未配置外部波形工具',
  })
  // 空 children 会被 NTree 当作可展开节点；明确标记真实叶子。
  const markLeaves = (nodes: TPTreeNode[]) => {
    for (const node of nodes) {
      node.isLeaf = !node.children?.length
      if (node.children)
        markLeaves(node.children)
    }
  }
  markLeaves(tree)
  const data = { manifest, configuration: config, definitions, hardware }
  return {
    path,
    name: typeof manifest.name === 'string' ? manifest.name : path.split('/').pop()!,
    data,
    tree,
    documents,
    warnings,
    adapter: { id: 'adapter.proxima-project', name: 'Proxima 工程', match: () => true, buildTree: () => tree },
  }
}
