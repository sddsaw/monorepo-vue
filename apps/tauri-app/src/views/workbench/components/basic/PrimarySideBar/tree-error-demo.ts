import type { TPTreeNode } from '@/core/tpModule'
import { getTreeErrorCounts } from '@/core/tree-errors'

/** 仅在 SCU(0) 模拟 3 个异常；展示用副本不修改工程数据。 */
export function getDemoTreeErrorCounts(nodes: TPTreeNode[]): Map<string, number> {
  const copy = (node: TPTreeNode): TPTreeNode => ({
    ...node,
    errorCount: node.nodeType === 'file' && !node.disabled && node.label === 'SCU(0)' ? 3 : 0,
    children: node.children?.map(copy),
  })
  return getTreeErrorCounts(nodes.map(copy))
}
