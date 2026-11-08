import type { TPModuleAdapter, TPTreeNode } from './tpModule'

/**
 * 测试流适配器 (TestFlow / TestProgram)
 * 匹配：TestFlow.json、*_flow.json、*_tp.json 或含有 testSuites 字段的 JSON
 */
export const testFlowAdapter: TPModuleAdapter = {
  id: 'adapter.test-flow',
  name: 'ATE 测试流程与测试项适配器',
  match: (fileName, json) => {
    return /^(?:TestFlow|.*_flow|.*_tp)\.json$/i.test(fileName) || Boolean(json && Array.isArray(json.testSuites))
  },
  buildTree: (json) => {
    if (!json || !Array.isArray(json.testSuites))
      return []

    return json.testSuites.map((suite: any, sIdx: number) => {
      const suiteId = `suite-${suite.name || sIdx}`
      const children: TPTreeNode[] = (suite.items || []).map((item: any, iIdx: number) => ({
        id: `item-${suite.name || sIdx}-${item.id || item.name || iIdx}`,
        label: item.name || '测试项',
        nodeType: 'file',
        icon: 'ri:test-tube-line',
        componentKey: item.testType || item.componentKey || 'Continuity',
        dataPath: ['testSuites', sIdx, 'items', iIdx],
        rawData: item,
      }))

      const suiteNode: TPTreeNode = {
        id: suiteId,
        label: `${suite.name || `测试套件 ${sIdx + 1}`} (${children.length})`,
        nodeType: 'folder',
        icon: 'ri:folder-line',
        dataPath: ['testSuites', sIdx],
        rawData: suite,
        children,
      }

      return suiteNode
    })
  },
  validate: (json) => {
    const errors: string[] = []
    if (json?.testSuites) {
      json.testSuites.forEach((suite: any, sIdx: number) => {
        suite.items?.forEach((item: any, iIdx: number) => {
          if (typeof item.loLimit === 'number' && typeof item.hiLimit === 'number' && item.loLimit > item.hiLimit) {
            errors.push(`[${suite.name || `Suite ${sIdx}`}] 测试项 [${item.name || iIdx}] 上下限反向: LowLimit (${item.loLimit}) > HighLimit (${item.hiLimit})`)
          }
        })
      })
    }
    return { valid: errors.length === 0, errors }
  },
}

/**
 * 管脚定义适配器 (PinMap)
 * 匹配：PinMap.json、*_pinmap.json 或含有 pins 字段的 JSON
 */
export const pinMapAdapter: TPModuleAdapter = {
  id: 'adapter.pin-map',
  name: '芯片管脚定义适配器',
  match: (fileName, json) => {
    return /^PinMap.*\.json$/i.test(fileName) || Boolean(json && (json.pins || json.pinGroups))
  },
  buildTree: (json) => {
    if (!json)
      return []
    const tree: TPTreeNode[] = []

    // 汇总表节点
    tree.push({
      id: 'pinmap-full-table',
      label: '全芯片管脚配置表',
      nodeType: 'file',
      icon: 'ri:table-line',
      componentKey: 'PinTable',
      dataPath: ['pins'],
      rawData: json.pins || {},
    })

    // 分组目录 (Folder)
    if (json.pinGroups && typeof json.pinGroups === 'object') {
      const groupChildren: TPTreeNode[] = Object.entries(json.pinGroups).map(([groupName, groupData]) => ({
        id: `pingroup-${groupName}`,
        label: `分组: ${groupName}`,
        nodeType: 'file',
        icon: 'ri:cpu-line',
        componentKey: 'PinTable',
        dataPath: ['pinGroups', groupName],
        rawData: groupData as Record<string, any>,
      }))

      tree.push({
        id: 'pingroups-folder',
        label: `管脚分组 (${groupChildren.length})`,
        nodeType: 'folder',
        icon: 'ri:folder-shared-line',
        children: groupChildren,
      })
    }

    return tree
  },
}

/**
 * 直流电平参数适配器 (Levels / Specs)
 * 匹配：Levels.json、Specs.json、*_spec.json
 */
export const levelsAdapter: TPModuleAdapter = {
  id: 'adapter.levels',
  name: '电平与直流参数适配器',
  match: (fileName, json) => {
    return /^(?:Levels|Specs|.*_spec)\.json$/i.test(fileName) || Boolean(json && (json.specs || json.categories))
  },
  buildTree: (json) => {
    if (!json)
      return []
    const tree: TPTreeNode[] = []

    if (Array.isArray(json.categories)) {
      json.categories.forEach((cat: any, cIdx: number) => {
        const catChildren: TPTreeNode[] = (cat.specSets || []).map((set: any, sIdx: number) => ({
          id: `specset-${cat.name}-${set.name || sIdx}`,
          label: set.name || `SpecSet ${sIdx + 1}`,
          nodeType: 'file',
          icon: 'ri:equalizer-line',
          componentKey: 'SpecTable',
          dataPath: ['categories', cIdx, 'specSets', sIdx],
          rawData: set,
        }))

        tree.push({
          id: `cat-${cat.name || cIdx}`,
          label: cat.name || `分类 ${cIdx + 1}`,
          nodeType: 'folder',
          icon: 'ri:folder-line',
          children: catChildren,
        })
      })
    }
    else {
      tree.push({
        id: 'spec-general-table',
        label: '直流电平总规格表',
        nodeType: 'file',
        icon: 'ri:table-line',
        componentKey: 'SpecTable',
        dataPath: ['specs'],
        rawData: json.specs || json,
      })
    }

    return tree
  },
}

/**
 * 通用 JSON 兜底适配器
 * 当无法命中任何特定格式时自动启用，将顶层对象展开为导航树
 */
export const genericJsonAdapter: TPModuleAdapter = {
  id: 'adapter.generic-json',
  name: '通用 JSON 导航适配器',
  match: () => true, // 永远可以作为兜底
  buildTree: (json) => {
    if (!json || typeof json !== 'object')
      return []

    return Object.entries(json).map(([key, value]) => {
      const isObject = value !== null && typeof value === 'object'
      const isArray = Array.isArray(value)

      if (isObject) {
        const subChildren: TPTreeNode[] = Object.entries(value).map(([subKey, subVal]) => ({
          id: `node-${key}-${subKey}`,
          label: `${subKey}: ${typeof subVal === 'object' ? (Array.isArray(subVal) ? `[${subVal.length}]` : '{...}') : String(subVal)}`,
          nodeType: 'file',
          icon: 'ri:file-code-line',
          componentKey: 'SuiteSummary',
          dataPath: [key, subKey],
          rawData: typeof subVal === 'object' ? subVal : { value: subVal },
        }))

        return {
          id: `folder-${key}`,
          label: `${key} ${isArray ? `[${value.length}]` : '{...}'}`,
          nodeType: 'folder',
          icon: 'ri:folder-line',
          dataPath: [key],
          rawData: value,
          children: subChildren,
        }
      }

      return {
        id: `node-${key}`,
        label: `${key}: ${String(value)}`,
        nodeType: 'file',
        icon: 'ri:file-text-line',
        componentKey: 'SuiteSummary',
        dataPath: [key],
        rawData: { [key]: value },
      }
    })
  },
}

/** 已注册的适配器集合列表 (按优先级降序排序) */
const registeredAdapters: TPModuleAdapter[] = [
  testFlowAdapter,
  pinMapAdapter,
  levelsAdapter,
  genericJsonAdapter, // 兜底适配器放在末尾
]

/**
 * 外部注册新适配器接口 (便于后续安装外部插件或扩充新机台类型)
 */
export function registerAdapter(adapter: TPModuleAdapter) {
  // 插在 generic 兜底适配器之前
  registeredAdapters.splice(registeredAdapters.length - 1, 0, adapter)
}

/**
 * 根据文件名与内容自动解析最匹配的适配器
 */
export function resolveAdapter(fileName: string, jsonContent: any): TPModuleAdapter {
  const matched = registeredAdapters.find(adapter => adapter.match(fileName, jsonContent))
  return matched || genericJsonAdapter
}
