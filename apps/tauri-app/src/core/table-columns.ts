/** 业务表格扩展列约定：定义保存在原 JSON 的 metadata.tableColumns，值直接保存在各数据行。 */
export type ColumnValue = string | number | boolean
export type ColumnValueType = 'string' | 'number' | 'boolean'
export interface BusinessColumn {
  key: string
  title: string
  type: ColumnValueType
  defaultValue: ColumnValue
}
export interface BusinessTableConfig { allowAddColumn?: boolean }

const reservedKeys = new Set(['__proto__', 'prototype', 'constructor', 'id', 'metadata', 'key', 'number', 'path', 'mapKey', 'cells'])
export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
export function validColumnValue(value: unknown, type: ColumnValueType): value is ColumnValue {
  return type === 'number'
    ? typeof value === 'number' && Number.isFinite(value)
    : type === 'boolean' ? typeof value === 'boolean' : type === 'string' && typeof value === 'string'
}

export function validateNewColumn(column: BusinessColumn, existing: BusinessColumn[], rows: Record<string, unknown>[]) {
  if (!/^[A-Z_]\w*$/i.test(column.key) || reservedKeys.has(column.key))
    throw new Error('字段标识需以字母或下划线开头，仅含字母、数字、下划线，且不能使用保留字段')
  if (!column.title.trim())
    throw new Error('请输入列名称')
  if (existing.some(item => item.key.toLowerCase() === column.key.toLowerCase()) || rows.some(row => Object.keys(row).some(key => key.toLowerCase() === column.key.toLowerCase())))
    throw new Error('字段标识已存在，请使用其他名称')
  if (!validColumnValue(column.defaultValue, column.type))
    throw new Error('默认值与列类型不匹配')
}

/** 固定列、持久化扩展列和已有标量字段合并；保留空表的列定义。 */
export function readBusinessColumns(document: Record<string, unknown>, base: BusinessColumn[], rows: Record<string, unknown>[]): BusinessColumn[] {
  const stored = isObject(document.metadata) ? document.metadata.tableColumns : undefined
  if (stored !== undefined && !Array.isArray(stored))
    throw new Error('metadata.tableColumns 必须是列定义数组')
  const ordered: BusinessColumn[] = []
  const seen = new Set<string>()
  for (const entry of stored ?? []) {
    if (!isObject(entry) || typeof entry.key !== 'string' || typeof entry.title !== 'string' || !['string', 'number', 'boolean'].includes(String(entry.type)) || !validColumnValue(entry.defaultValue, entry.type as ColumnValueType))
      throw new Error('metadata.tableColumns 中存在无效列定义')
    if (seen.has(entry.key) || reservedKeys.has(entry.key))
      throw new Error('metadata.tableColumns 中存在重复或保留字段')
    seen.add(entry.key)
    ordered.push(base.find(column => column.key === entry.key) ?? entry as unknown as BusinessColumn)
  }
  for (const column of base) {
    if (!seen.has(column.key)) {
      ordered.push(column)
      seen.add(column.key)
    }
  }
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (seen.has(key) || reservedKeys.has(key) || !['string', 'number', 'boolean'].includes(typeof value))
        continue
      ordered.push({ key, title: key, type: typeof value as ColumnValueType, defaultValue: typeof value === 'number' ? 0 : typeof value === 'boolean' ? false : '' })
      seen.add(key)
    }
  }
  return ordered
}
