import type { ProjectBundle, ProjectDocument } from '@/core/project-bundle'
import type { PreparedProject, ProjectLoadState } from '@/core/project-loader'
import type { TPModuleAdapter, TPTreeNode, TPValidationResult } from '@/core/tpModule'
import type { SelectedProjectFile } from '@/services/project-file'
import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { prepareProjectBundle } from '@/core/project-bundle'
import { prepareProject } from '@/core/project-loader'
import { SetupStoreId } from '@/enum'
import { isTauri } from '@/plugins/tauri'
import { assertPrxFile, selectProjectDirectory, selectProjectFile } from '@/services/project-file'

/** 工作区打开的业务组件 Tab 项 */
export interface WbTabItem {
  id: string
  label: string
  icon?: string
  componentKey: string
  dataPath: (string | number)[]
  isDirty?: boolean
  pinned?: boolean
  /** 独立网页面板，不绑定工程 JSON。 */
  iframeSrc?: string
}

/** 最近打开的工程记录 */
export interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: string
}

export const DEFAULT_RECENT_PROJECTS: RecentProject[] = []

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
  const projectDocuments = shallowRef<ProjectDocument[]>([])
  const projectWarnings = ref<string[]>([])

  // ─── 2. 当前匹配的模块适配器与目录树 ───
  const activeAdapter = shallowRef<TPModuleAdapter | null>(null)
  const treeData = shallowRef<TPTreeNode[]>([])
  const activeNodeId = ref<string>('')

  // ─── 3. 右侧多标签工作区 (Tabs) 状态 ───
  const tabs = ref<WbTabItem[]>([])
  const activeTabId = ref<string>('')

  // 只记录修改位置与版本，不复制工程或比较已保存内容。
  const dirtyChanges = new Map<string, { path: (string | number)[], revision: number }>()
  let editRevision = 0
  let saveQueue: Promise<boolean> = Promise.resolve(false)

  function isPathDirty(path: (string | number)[]) {
    return Array.from(dirtyChanges.values()).some(change =>
      path.slice(0, Math.min(path.length, change.path.length))
        .every((segment, index) => segment === change.path[index]),
    )
  }

  function refreshDirtyTabs() {
    for (const tab of tabs.value)
      tab.isDirty = !tab.iframeSrc && tab.componentKey !== 'SettingsView' && isPathDirty(tab.dataPath)
    fileDirty.value = dirtyChanges.size > 0
  }

  // ─── 4. DRC 硬件/规则校验结果 ───
  const validationResult = ref<TPValidationResult>({ valid: true, errors: [] })

  // ─── 4.1 最近打开工程列表 ───
  const recentProjects = ref<RecentProject[]>([...DEFAULT_RECENT_PROJECTS])

  function addRecentProject(name: string, path: string) {
    const now = new Date()
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const existingIdx = recentProjects.value.findIndex(p => p.path === path)
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

  function removeRecentProject(path: string) {
    const idx = recentProjects.value.findIndex(p => p.path === path)
    if (idx > -1) {
      recentProjects.value.splice(idx, 1)
      try {
        localStorage.setItem('proxima_recent_projects', JSON.stringify(recentProjects.value))
      }
      catch {
        // ignore
      }
    }
  }

  // 初始化尝试加载本地记忆的最近工程
  try {
    const saved = localStorage.getItem('proxima_recent_projects')
    if (saved) {
      const records: unknown = JSON.parse(saved)
      if (Array.isArray(records)) {
        recentProjects.value = records.filter((item): item is RecentProject =>
          item && typeof item.id === 'string' && typeof item.name === 'string'
          && typeof item.path === 'string' && /\.prx$/i.test(item.path)
          && typeof item.lastOpened === 'string',
        )
      }
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

  const projectBusy = ref(false)
  const projectLoad = ref<ProjectLoadState>({
    status: 'idle',
    name: '',
    path: '',
    progress: 0,
    stage: '',
    error: '',
  })
  let loadController: AbortController | null = null

  function commitProject(project: PreparedProject) {
    filePath.value = project.path
    rawJson.value = project.data
    projectDocuments.value = project.documents ?? []
    projectWarnings.value = project.warnings ?? []
    activeAdapter.value = project.adapter
    dirtyChanges.clear()
    tabs.value = []
    activeTabId.value = ''
    activeNodeId.value = ''
    fileDirty.value = false
    validationResult.value = { valid: true, errors: [] }
    treeData.value = project.tree
    if (/\.prx$/i.test(project.path))
      addRecentProject(project.name, project.path)
  }

  /** 内部数据导入入口；读文件、解析和建树全部成功后才替换当前工程。 */
  async function loadFile(selectedPath: string, contentStr?: string) {
    const content = contentStr ?? await readProjectContent({ path: selectedPath })
    commitProject(await prepareSelectedProject({ path: selectedPath }, content))
  }

  async function readProjectContent(selected: SelectedProjectFile) {
    if (selected.read)
      return selected.read()
    if (!isTauri())
      throw new Error('请重新选择本地 .prx 文件，浏览器无法直接读取历史路径')
    return invoke<string>('read_file_content', { path: selected.path })
  }

  async function prepareSelectedProject(selected: SelectedProjectFile, content: string) {
    const basic = prepareProject(selected.path, content)
    if (!('configFile' in basic.data) && !('DefFileFolder' in basic.data))
      return basic
    const bundle = selected.readBundle
      ? await selected.readBundle()
      : isTauri()
        ? await invoke<ProjectBundle>('read_project_bundle', { path: selected.path })
        : null
    if (!bundle)
      throw new Error('此 .prx 需要读取关联文件。请使用首页的“选择工程目录”入口，或在桌面客户端打开。')
    return prepareProjectBundle(selected.path, bundle)
  }

  function confirmProjectReplacement(): Promise<boolean> {
    if (!isDirty.value)
      return Promise.resolve(true)
    return new Promise((resolve) => {
      if (!window.$dialog) {
        resolve(false)
        return
      }
      window.$dialog.warning({
        title: '当前工程有未保存的修改',
        content: '打开其他测试程序会放弃当前修改。是否继续？',
        positiveText: '放弃修改并打开',
        negativeText: '取消',
        onPositiveClick: () => { resolve(true) },
        onNegativeClick: () => { resolve(false) },
        onClose: () => { resolve(false) },
        onMaskClick: () => { resolve(false) },
        onEsc: () => { resolve(false) },
      })
    })
  }

  function cancelProjectLoad() {
    loadController?.abort()
    loadController = null
    projectBusy.value = false
    projectLoad.value.status = 'idle'
  }

  /** 所有用户打开入口共用后缀校验、模拟 Load、错误与取消处理。 */
  async function openProject(selectedFile?: SelectedProjectFile, select = selectProjectFile) {
    if (projectBusy.value)
      return false
    const controller = new AbortController()
    loadController = controller
    projectBusy.value = true
    projectLoad.value = { status: 'idle', name: '', path: '', progress: 0, stage: '', error: '' }
    const wait = (ms: number) => new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer)
        controller.signal.removeEventListener('abort', finish)
        resolve()
      }
      const timer = setTimeout(finish, ms)
      controller.signal.addEventListener('abort', finish, { once: true })
      if (controller.signal.aborted)
        finish()
    })
    try {
      const selected = selectedFile ?? await select()
      if (!selected || controller.signal.aborted)
        return false
      projectLoad.value.name = selected.path.replace(/\\/g, '/').split('/').pop() || selected.path
      projectLoad.value.path = selected.path
      assertPrxFile(selected.path)
      if (!await confirmProjectReplacement() || controller.signal.aborted)
        return false
      projectLoad.value = {
        status: 'checking',
        name: selected.path.replace(/\\/g, '/').split('/').pop() || selected.path,
        path: selected.path,
        progress: 0,
        stage: '正在检查工程文件，尚未开始 Load',
        error: '',
      }
      const content = await readProjectContent(selected)
      if (controller.signal.aborted)
        return false
      projectLoad.value.stage = '正在检查配置、定义及关联文件'
      const project = await prepareSelectedProject(selected, content)
      if (controller.signal.aborted)
        return false
      Object.assign(projectLoad.value, { name: project.name, status: 'loading', progress: 8, stage: '文件检查通过，开始 Load' })
      const stages = [
        { progress: 30, stage: '解析程序配置' },
        { progress: 60, stage: '构建测试导航树' },
        { progress: 85, stage: '初始化测试工作区' },
      ]
      for (const stage of stages) {
        await wait(550)
        if (controller.signal.aborted)
          return false
        Object.assign(projectLoad.value, stage)
      }
      await wait(450)
      if (controller.signal.aborted)
        return false
      Object.assign(projectLoad.value, { progress: 100, status: 'success', stage: '加载成功，正在进入工作台' })
      await wait(450)
      if (controller.signal.aborted)
        return false
      commitProject(project)
      projectLoad.value.status = 'idle'
      return true
    }
    catch (error) {
      if (!controller.signal.aborted) {
        projectLoad.value = {
          ...projectLoad.value,
          status: 'error',
          stage: projectLoad.value.progress === 0 ? '文件检查未通过' : '加载失败',
          error: error instanceof Error ? error.message : (typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error)),
        }
      }
      return false
    }
    finally {
      if (loadController === controller) {
        loadController = null
        projectBusy.value = false
      }
    }
  }

  function chooseAndOpenFile() {
    return openProject()
  }

  function chooseAndOpenDirectory() {
    return openProject(undefined, selectProjectDirectory)
  }

  function openRecentProject(path: string) {
    return openProject(isTauri() ? { path } : undefined)
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
          name: 'OS_Continuity',
          items: [
            { id: 'TC_001', name: 'Ground_Clamp', testType: 'Continuity', pinGroup: 'ALL_IO_PINS', forceCurrent: -100, voltageClamp: 1.5, loLimit: -0.85, hiLimit: -0.2, unit: 'V', settlingTimeMs: 2.5 },
            { id: 'TC_002', name: 'Power_Clamp', testType: 'Continuity', pinGroup: 'ALL_IO_PINS', forceCurrent: 100, voltageClamp: 1.5, loLimit: 0.2, hiLimit: 0.85, unit: 'V', settlingTimeMs: 2.5 },
          ],
        },
        {
          name: 'IDDQ_Current',
          items: [
            { id: 'TC_101', name: 'Standby_Mode', testType: 'Iddq', vccVolt: 3.3, maxCurrentUa: 50, settlingTimeMs: 15, preconditionPattern: 'pat_standby_reset_vector', sampleCount: 16, passFailCount: 0 },
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
        const path = [...dataPath, field]
        dirtyChanges.set(JSON.stringify(path), { path, revision: ++editRevision })
        // 同步所有包含或被替换的视图，不依赖当前激活面板。
        refreshDirtyTabs()
      }
    }
  }

  /** 打开业务测试项 Tab (过滤 folder 节点) */
  function openTab(node: TPTreeNode) {
    if (node.nodeType === 'folder' || node.disabled)
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
      isDirty: isPathDirty(node.dataPath || []),
    }

    tabs.value.push(newTab)
    activeTabId.value = node.id
  }

  /** 打开网页面板；相同 ID 再次打开时激活原面板。 */
  function openIframeTab(options: { id: string, title: string, src: string }) {
    const id = `iframe:${options.id}`
    if (!tabs.value.some(tab => tab.id === id)) {
      tabs.value.push({
        id,
        label: options.title,
        icon: 'ri:window-line',
        componentKey: 'WorkbenchIframe',
        dataPath: [],
        iframeSrc: options.src,
        isDirty: false,
      })
    }
    activeTabId.value = id
  }

  /** 打开首选项与设置视图 */
  function openSettingsTab() {
    const SETTINGS_TAB_ID = 'workbench-settings'
    const existingIndex = tabs.value.findIndex(tab => tab.id === SETTINGS_TAB_ID)
    if (existingIndex > -1) {
      activeTabId.value = SETTINGS_TAB_ID
      activeNodeId.value = SETTINGS_TAB_ID
      return
    }

    const settingsTab: WbTabItem = {
      id: SETTINGS_TAB_ID,
      label: '设置',
      icon: 'ri:equalizer-line',
      componentKey: 'SettingsView',
      dataPath: [],
      isDirty: false,
    }

    tabs.value.push(settingsTab)
    activeTabId.value = SETTINGS_TAB_ID
    activeNodeId.value = SETTINGS_TAB_ID
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

  /** 判断指定 Tab 是否已固定 */
  function isTabPinned(tabId: string) {
    return Boolean(tabs.value.find(tab => tab.id === tabId)?.pinned)
  }

  /** 设置指定 Tab 固定状态 */
  function setTabPinned(tabId: string, pinned: boolean) {
    const target = tabs.value.find(tab => tab.id === tabId)
    if (target) {
      target.pinned = pinned
    }
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

  /** 按请求顺序保存，成功后仅清除本次已写入的修改标记。 */
  function saveFile(): Promise<boolean> {
    const requestedData = rawJson.value
    const requestedPath = filePath.value
    const requestedDocuments = projectDocuments.value
    const save = async () => {
      if (!requestedPath || !requestedData
        || rawJson.value !== requestedData || filePath.value !== requestedPath) {
        return false
      }

      if (!isTauri()) {
        window.$message?.warning('请在桌面客户端中保存文件，未保存标记已保留')
        return false
      }

      try {
        // 保留现有语义：校验失败仍允许保存，结果由校验面板展示。
        runValidation()
        const savedRevision = editRevision
        if (requestedDocuments.length) {
          // 聚合对象绝不写回 .prx；每份源文档仅写回其自己的文件。
          const root = requestedPath.replace(/\\/g, '/').replace(/[^/]+$/, '')
          const changes = [...dirtyChanges.values()]
          const targets = requestedDocuments.filter(document => changes.some(change =>
            document.dataPath.every((key, index) => change.path[index] === key),
          ))
          if (changes.some(change => !requestedDocuments.some(document => document.dataPath.every((key, index) => change.path[index] === key))))
            throw new Error('当前修改不属于可保存的源文件')
          // 一次构造所有快照，避免 await 期间的编辑混入本次保存。
          const snapshots = targets.map(document => ({ path: `${root}${document.path}`, content: JSON.stringify(getByPath(requestedData, document.dataPath), null, 2) }))
          for (const snapshot of snapshots)
            await invoke('save_file_content', snapshot)
        }
        else {
          const content = JSON.stringify(requestedData, null, 2)
          await invoke('save_file_content', { path: requestedPath, content })
        }

        // 保存期间可能已打开其他工程，不能清除新工程的修改状态。
        if (rawJson.value === requestedData && filePath.value === requestedPath) {
          for (const [key, change] of dirtyChanges) {
            if (change.revision <= savedRevision)
              dirtyChanges.delete(key)
          }
          refreshDirtyTabs()
        }
        return true
      }
      catch (error) {
        window.$message?.error(`保存失败，未保存标记已保留：${String(error)}`)
        return false
      }
    }

    // 避免连续 Ctrl+S 导致旧快照晚于新快照写入磁盘。
    saveQueue = saveQueue.then(save, save)
    return saveQueue
  }

  return {
    rawJson,
    projectWarnings,
    projectDocuments,
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
    removeRecentProject,
    loadFile,
    projectBusy,
    projectLoad,
    cancelProjectLoad,
    openProject,
    openRecentProject,
    chooseAndOpenFile,
    chooseAndOpenDirectory,
    loadSampleData,
    getItemData,
    updateItemField,
    openTab,
    openIframeTab,
    openSettingsTab,
    closeTab,
    setActiveTab,
    isTabPinned,
    setTabPinned,
    runValidation,
    saveFile,
  }
})
