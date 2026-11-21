import type { ProjectDocument } from './project-bundle'
import type { TPModuleAdapter, TPTreeNode } from './tpModule'
import { resolveAdapter } from './adapterManager'

export interface PreparedProject {
  path: string
  name: string
  data: Record<string, unknown>
  adapter: TPModuleAdapter
  tree: TPTreeNode[]
  documents?: ProjectDocument[]
  warnings?: string[]
}

export interface ProjectLoadState {
  status: 'idle' | 'checking' | 'loading' | 'success' | 'error'
  name: string
  path: string
  progress: number
  stage: string
  error: string
}

/** 先完整解析、生成导航树，成功前不修改当前工程。 */
export function prepareProject(path: string, content: string): PreparedProject {
  let data: unknown
  try {
    data = JSON.parse(content.replace(/^\uFEFF/, ''))
  }
  catch {
    throw new Error('文件内容不是有效的 JSON，请检查 .prx 文件后重新选择')
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length)
    throw new Error('测试程序必须是非空的 JSON 对象')

  const record = data as Record<string, unknown>
  const fileName = path.replace(/\\/g, '/').split('/').pop() || path
  const adapter = resolveAdapter(fileName, data)
  let tree: TPTreeNode[]
  try {
    tree = adapter.buildTree(data)
  }
  catch {
    throw new Error('测试程序结构不正确，无法生成菜单树，请检查测试套件或配置数据')
  }
  return {
    path,
    name: typeof record.name === 'string' && record.name.trim() ? record.name.trim() : fileName,
    data: record,
    adapter,
    tree,
  }
}
