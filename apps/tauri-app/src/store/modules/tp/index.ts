import type { TPModuleAdapter, TPTreeNode, TPValidationResult } from '@/core/tpModule'
import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { resolveAdapter } from '@/core/adapterManager'
import { SetupStoreId } from '@/enum'
import { isTauri } from '@/plugins/tauri'

/** 工作区打开的业务组件 Tab 项 */
export interface WbTabItem {
  id: string
  label: string
  icon?: string
  componentKey: string
  dataPath: (string | number)[]
  isDirty?: boolean
}

/** 最近打开的工程记录 */
export interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: string
}

export const DEFAULT_RECENT_PROJECTS: RecentProject[] = [
  {
    id: 'proj-1',
    name: 'TP_MVS_Checker',
    path: 'C:\\Users\\ArcUser\\Downloads\\MVS1A_Checker_TP\\MVS1A_Checker_TP\\TP_MVS_Checker',
    lastOpened: '2026/10/23 17:25',
  },
  {
    id: 'proj-2',
    name: 'MIO_Checker',
    path: 'C:\\Users\\ArcUser\\Downloads\\DII_realized\\DII_realized\\MIO_Checker',
    lastOpened: '2026/10/21 22:31',
  },
  {
    id: 'proj-3',
    name: 'MIO_Cal',
    path: 'C:\\Users\\ArcUser\\Downloads\\DII_realized\\DII_realized\\MIO_Cal',
    lastOpened: '2026/10/20 09:53',
  },
  {
    id: 'proj-4',
    name: 'Case-vs-visualizer',
    path: 'C:\\syn\\AE\\Case-vs-visualizer\\Offline',
    lastOpened: '2026/10/19 21:16',
  },
  {
    id: 'proj-5',
    name: 'case-vih-group',
    path: 'C:\\syn\\AE\\case-vih-group\\Offline',
    lastOpened: '2026/10/16 10:18',
  },
]

/** 路径极速寻址取值 (耗时 0.0001ms) */
export function getByPath(obj: any, path: (string | number)[]) {
  if (!obj || !Array.isArray(path))
    return undefined
  return path.reduce((acc, key) => (acc !== null && acc !== undefined ? acc[key] : undefined), obj)
}

export const useTpStore = defineStore(SetupStoreId.Tp, () => {
  // ─── 1. 大数据底层存储 (100MB 级别采用 shallowRef 绝不触发深层 Proxy 遍历) ───
  const rawJson = shallowRef<any>(null)
  const filePath = ref<string>('')
  const fileDirty = ref<boolean>(false)

  // ─── 2. 当前匹配的模块适配器与目录树 ───
  const activeAdapter = shallowRef<TPModuleAdapter | null>(null)
  const treeData = shallowRef<TPTreeNode[]>([])
  const activeNodeId = ref<string>('')

  // ─── 3. 右侧多标签工作区 (Tabs) 状态 ───
  const tabs = ref<WbTabItem[]>([])
  const activeTabId = ref<string>('')

  // ─── 4. DRC 硬件/规则校验结果 ───
  const validationResult = ref<TPValidationResult>({ valid: true, errors: [] })

  // ─── 4.1 最近打开工程列表 ───
  const recentProjects = ref<RecentProject[]>(DEFAULT_RECENT_PROJECTS)

  function addRecentProject(name: string, path: string) {
    const now = new Date()
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const existingIdx = recentProjects.value.findIndex(p => p.path === path || p.name === name)
    if (existingIdx > -1) {
      recentProjects.value.splice(existingIdx, 1)
    }

    recentProjects.value.unshift({
      id: `proj-${Date.now()}`,
      name: name || 'ATE_Project',
      path,
      lastOpened: dateStr,
    })

    try {
      localStorage.setItem('proxima_recent_projects', JSON.stringify(recentProjects.value))
    }
    catch {
      // ignore
    }
  }

  // 初始化尝试加载本地记忆的最近工程
  try {
    const saved = localStorage.getItem('proxima_recent_projects')
    if (saved) {
      recentProjects.value = JSON.parse(saved)
    }
  }
  catch {
    // ignore
  }

  // 计算属性
  const fileName = computed(() => {
    if (!filePath.value)
      return ''
    const parts = filePath.value.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || ''
  })

  const activeTab = computed(() => {
    return tabs.value.find(tab => tab.id === activeTabId.value)
  })

  const isDirty = computed(() => {
    return fileDirty.value || tabs.value.some(tab => tab.isDirty)
  })

  const activeNode = computed(() => {
    function findNode(nodes: TPTreeNode[], id: string): TPTreeNode | null {
      for (const node of nodes) {
        if (node.id === id)
          return node
        if (node.children) {
          const found = findNode(node.children, id)
          if (found)
            return found
        }
      }
      return null
    }
    return findNode(treeData.value, activeNodeId.value)
  })

  // ─── 5. 操作方法 ───

  /** 从本地磁盘读取并载入 JSON 文件 */
  async function loadFile(selectedPath: string, contentStr?: string) {
    filePath.value = selectedPath

    let content = contentStr
    if (!content) {
      if (isTauri()) {
        content = await invoke<string>('read_file_content', { path: selectedPath })
      }
      else {
        throw new Error('当前非 Tauri 原生桌面环境，请直接传入文件内容')
      }
    }

    // 解析为原生对象
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    rawJson.value = parsed

    // 匹配最适合该文件的适配器
    const adapter = resolveAdapter(fileName.value, parsed)
    activeAdapter.value = adapter

    // 生成左侧树结构
    treeData.value = adapter.buildTree(parsed)

    // 重置状态
    tabs.value = []
    activeTabId.value = ''
    activeNodeId.value = ''
    fileDirty.value = false
    validationResult.value = { valid: true, errors: [] }

    // 记忆会话并更新最近打开列表
    try {
      localStorage.setItem('ate_last_opened_file', selectedPath)
      const baseName = fileName.value || selectedPath.replace(/\\/g, '/').split('/').pop() || 'ATE_Project'
      addRecentProject(baseName, selectedPath)
    }
    catch {
      // ignore
    }
  }

  /** 弹出系统对话框选择本地文件并打开 */
  async function chooseAndOpenFile() {
    if (isTauri()) {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [{ name: 'Test Program JSON', extensions: ['json'] }],
      })

      if (typeof selected === 'string') {
        await loadFile(selected)
      }
    }
    else if (typeof document !== 'undefined') {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = () => {
            loadFile(file.name, reader.result as string)
          }
          reader.readAsText(file)
        }
      }
      input.click()
    }
  }

  /** 载入内置的芯片测试样例数据进行全流程快速联调 */
  async function loadSampleData() {
    try {
      const resp = await fetch('/test_assets/Sample_Chip_ATE_TP.json')
      if (resp.ok) {
        const json = await resp.json()
        await loadFile('/workspace/chips/Sample_Chip_ATE_TP.json', JSON.stringify(json))
        return
      }
    }
    catch {
      // 容错回退
    }

    const fallback = {
      testSuites: [
        {
          name: 'OS_Continuity_Suite',
          items: [
            { id: 'TC_001', name: 'OS_Ground_Clamp_Diode', testType: 'Continuity', pinGroup: 'ALL_IO_PINS', forceCurrent: -100, voltageClamp: 1.5, loLimit: -0.85, hiLimit: -0.2, unit: 'V', settlingTimeMs: 2.5 },
            { id: 'TC_002', name: 'OS_Power_Clamp_Diode', testType: 'Continuity', pinGroup: 'ALL_IO_PINS', forceCurrent: 100, voltageClamp: 1.5, loLimit: 0.2, hiLimit: 0.85, unit: 'V', settlingTimeMs: 2.5 },
          ],
        },
        {
          name: 'Static_Current_IDDQ_Suite',
          items: [
            { id: 'TC_101', name: 'IDDQ_Standby_Mode', testType: 'Iddq', vccVolt: 3.3, maxCurrentUa: 50, settlingTimeMs: 15, preconditionPattern: 'pat_standby_reset_vector', sampleCount: 16, passFailCount: 0 },
          ],
        },
      ],
    }
    await loadFile('/workspace/chips/Sample_Chip_ATE_TP.json', JSON.stringify(fallback))
  }

  /** 【取数据】：顺着 dataPath 路径只切出当前测试项微量数据 (2KB) */
  function getItemData(dataPath: (string | number)[]) {
    return getByPath(rawJson.value, dataPath)
  }

  /** 【改数据】：精准修改内存大底座中的对应字段 */
  function updateItemField(dataPath: (string | number)[], field: string, newValue: any, origin: 'ui' | 'redis' = 'ui') {
    const item = getItemData(dataPath)
    if (item && typeof item === 'object') {
      item[field] = newValue

      if (origin === 'ui') {
        // 标记当前 Tab 与全局脏状态
        const currentTab = tabs.value.find(t => t.id === activeTabId.value)
        if (currentTab)
          currentTab.isDirty = true
        fileDirty.value = true
      }
    }
  }

  /** 打开业务测试项 Tab (过滤 folder 节点) */
  function openTab(node: TPTreeNode) {
    if (node.nodeType === 'folder')
      return // 文件夹节点坚决不打开标签页

    activeNodeId.value = node.id

    const existingIndex = tabs.value.findIndex(tab => tab.id === node.id)
    if (existingIndex > -1) {
      activeTabId.value = node.id
      return
    }

    const newTab: WbTabItem = {
      id: node.id,
      label: node.label,
      icon: node.icon,
      componentKey: node.componentKey || 'SuiteSummary',
      dataPath: node.dataPath || [],
      isDirty: false,
    }

    tabs.value.push(newTab)
    activeTabId.value = node.id
  }

  /** 关闭指定 Tab */
  function closeTab(tabId: string) {
    const index = tabs.value.findIndex(tab => tab.id === tabId)
    if (index === -1)
      return

    tabs.value.splice(index, 1)

    // 如果关闭的是当前激活 Tab，自动激活邻近标签
    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        const nextIndex = Math.min(index, tabs.value.length - 1)
        const nextTab = tabs.value[nextIndex]
        activeTabId.value = nextTab.id
        activeNodeId.value = nextTab.id
      }
      else {
        activeTabId.value = ''
        activeNodeId.value = ''
      }
    }
  }

  /** 设置当前激活 Tab */
  function setActiveTab(tabId: string) {
    activeTabId.value = tabId
    activeNodeId.value = tabId
  }

  /** 执行 DRC 规则校验 */
  function runValidation(): TPValidationResult {
    if (activeAdapter.value?.validate && rawJson.value) {
      const result = activeAdapter.value.validate(rawJson.value)
      validationResult.value = result
      return result
    }
    validationResult.value = { valid: true, errors: [] }
    return validationResult.value
  }

  /** 将内存数据安全原子保存回本地物理文件 */
  async function saveFile() {
    if (!filePath.value || !rawJson.value)
      return false

    // 保存前执行校验
    const check = runValidation()
    if (!check.valid) {
      // 校验失败仍允许保存，但暴露错误提示
    }

    const content = JSON.stringify(rawJson.value, null, 2)
    if (isTauri()) {
      await invoke('save_file_content', { path: filePath.value, content })
    }

    // 清除所有脏标记
    tabs.value.forEach((tab) => {
      tab.isDirty = false
    })
    fileDirty.value = false
    return true
  }

  return {
    rawJson,
    filePath,
    fileName,
    fileDirty,
    activeAdapter,
    treeData,
    activeNodeId,
    activeNode,
    tabs,
    activeTabId,
    activeTab,
    isDirty,
    validationResult,
    recentProjects,
    addRecentProject,
    loadFile,
    chooseAndOpenFile,
    loadSampleData,
    getItemData,
    updateItemField,
    openTab,
    closeTab,
    setActiveTab,
    runValidation,
    saveFile,
  }
})
