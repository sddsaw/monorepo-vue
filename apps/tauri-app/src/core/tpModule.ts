/**
 * 树节点类型：
 * - folder: 目录/分类/套件节点，点击仅触发展开与收起，不打开右侧工作区标签页
 * - file: 具体测试项业务文件节点，点击在右侧多标签区打开对应自定义业务组件
 */
export type TPTreeNodeType = 'folder' | 'file'

/**
 * ATE 测试导航树节点抽象模型
 */
export interface TPTreeNode {
  /** 节点唯一主键标识 (如 'suite-0-item-3') */
  id: string
  /** 节点显示名称 (如 'Continuity_Test' 或 'DC_TestSuite') */
  label: string
  isLeaf?: boolean
  disabled?: boolean
  description?: string
  /** 节点自身的异常数量（不含子节点，父级汇总由导航树计算） */
  errorCount?: number
  /** 节点类型：folder 仅展开收起；file 点击触发打开对应业务组件 */
  nodeType: TPTreeNodeType
  /** 自定义图标标识符 */
  icon?: string
  /** 映射渲染的业务组件键名 (nodeType === 'file' 时有效，受控于 TPComponentKey) */
  componentKey?: string
  /** 当前节点数据在原始主 JSON 中的寻址路径，支持深层嵌套 (例如: ['testSuites', 0, 'items', 3]) */
  dataPath?: (string | number)[]
  /** 传入业务组件的当前节点数据快照/引用 (nodeType === 'file' 时有效) */
  rawData?: Record<string, any>
  /** 分类与可打开的硬件节点均可包含子节点 */
  children?: TPTreeNode[]
}

/**
 * 模块适配器规则校验结果
 */
export interface TPValidationIssue {
  message: string
  /** 异常在工程 JSON 中的位置，用于关联导航节点；不依赖显示名称。 */
  dataPath: (string | number)[]
}

export interface TPValidationResult {
  valid: boolean
  errors: string[]
  issues?: TPValidationIssue[]
}

/**
 * ATE 测试模块适配器接口规范
 * 负责针对特定命名或结构的 JSON 文件进行特征匹配与目录树提取
 */
export interface TPModuleAdapter {
  /** 适配器唯一 ID */
  id: string
  /** 适配器可读名称 */
  name: string
  /** 1. 匹配规则：根据文件名或 JSON 内容特征判断是否归属该模块处理 */
  match: (fileName: string, jsonContent: any) => boolean
  /** 2. 树生成器：从该模块特定的 JSON 结构提取标准树结构 (标注清楚 folder 与 file) */
  buildTree: (jsonContent: any) => TPTreeNode[]
  /** 3. 校验器：保存前的硬件/DRC 规则检查 (可选) */
  validate?: (jsonContent: any) => TPValidationResult
}
