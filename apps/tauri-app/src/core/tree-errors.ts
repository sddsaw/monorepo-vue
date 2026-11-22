import type { TPTreeNode, TPValidationIssue } from './tpModule'

/** 每条异常只归属路径最匹配的节点，再沿树逐层汇总，避免父子路径重复计数。 */
export function getTreeErrorCounts(nodes: TPTreeNode[], issues: TPValidationIssue[] = []): Map<string, number> {
  const nodesByPath = new Map<string, string>()
  const ownCounts = new Map<string, number>()
  const totals = new Map<string, number>()

  function indexNodes(branch: TPTreeNode[]) {
    for (const node of branch) {
      if (node.dataPath)
        nodesByPath.set(JSON.stringify(node.dataPath), node.id)
      ownCounts.set(node.id, Number.isFinite(node.errorCount) ? Math.max(0, Math.floor(node.errorCount!)) : 0)
      if (node.children)
        indexNodes(node.children)
    }
  }
  indexNodes(nodes)

  for (const issue of issues) {
    const path = [...issue.dataPath]
    while (true) {
      const id = nodesByPath.get(JSON.stringify(path))
      if (id !== undefined) {
        ownCounts.set(id, (ownCounts.get(id) ?? 0) + 1)
        break
      }
      if (!path.length)
        break
      path.pop()
    }
  }

  function sumBranch(branch: TPTreeNode[]): number {
    let sum = 0
    for (const node of branch) {
      const count = (ownCounts.get(node.id) ?? 0) + sumBranch(node.children ?? [])
      totals.set(node.id, count)
      sum += count
    }
    return sum
  }
  sumBranch(nodes)
  return totals
}
