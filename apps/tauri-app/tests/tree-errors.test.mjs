/* eslint-disable test/no-import-node-test -- 使用项目现有的 Node 内置测试运行器。 */
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { getTreeErrorCounts } from '../src/core/tree-errors.ts'

it('aggregates 2, 3, 0 through multiple levels, including file nodes with children', () => {
  const tree = [{
    id: 'root',
    nodeType: 'folder',
    children: [{
      id: 'hardware',
      nodeType: 'file',
      children: [
        { id: 'a', nodeType: 'file', errorCount: 2 },
        { id: 'b', nodeType: 'file', errorCount: 3 },
        { id: 'c', nodeType: 'file', errorCount: 0 },
      ],
    }],
  }]
  const original = JSON.stringify(tree)
  const counts = getTreeErrorCounts(tree)
  assert.equal(counts.get('root'), 5)
  assert.equal(counts.get('hardware'), 5)
  assert.equal(counts.get('a'), 2)
  assert.equal(counts.get('b'), 3)
  assert.equal(counts.get('c'), 0)
  assert.equal(JSON.stringify(tree), original)
})

it('attributes errors to the closest data path once, independent of identical labels', () => {
  const tree = [{
    id: 'suite',
    nodeType: 'folder',
    dataPath: ['suites', 0],
    children: [
      { id: 'a', label: 'Same', nodeType: 'file', dataPath: ['suites', 0, 'items', 0] },
      { id: 'b', label: 'Same', nodeType: 'file', dataPath: ['suites', 0, 'items', 1] },
    ],
  }]
  const issue = dataPath => ({ message: 'error', dataPath })
  const counts = getTreeErrorCounts(tree, [
    issue(['suites', 0, 'items', 0, 'loLimit']),
    issue(['suites', 0, 'items', 0, 'hiLimit']),
    issue(['suites', 0, 'items', 1]),
    issue(['unrelated']),
  ])
  assert.equal(counts.get('a'), 2)
  assert.equal(counts.get('b'), 1)
  assert.equal(counts.get('suite'), 3)
  assert.deepEqual([...getTreeErrorCounts(tree).values()], [0, 0, 0])
})
