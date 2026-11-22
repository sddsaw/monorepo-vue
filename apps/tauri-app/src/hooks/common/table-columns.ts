import type { BusinessColumn, BusinessTableConfig } from '@/core/table-columns'
import { computed, ref } from 'vue'
import { validateNewColumn } from '@/core/table-columns'

/** 公共列操作状态，业务页面负责将最终定义和值写回其 JSON 数据结构。 */
export function useBusinessTableColumns(options: {
  config: () => BusinessTableConfig | undefined
  columns: () => BusinessColumn[]
  rows: () => Record<string, unknown>[]
  apply: (columns: BusinessColumn[], added: BusinessColumn) => void
}) {
  const editingColumn = ref<string>()
  const selectedColumn = ref<string>()
  const error = ref('')
  const allowAddColumn = computed(() => options.config()?.allowAddColumn === true)
  function addColumn(column: BusinessColumn, anchor = selectedColumn.value, side: 'left' | 'right' = 'right') {
    if (!allowAddColumn.value)
      return
    error.value = ''
    try {
      validateNewColumn(column, options.columns(), options.rows())
      const columns = [...options.columns()]
      const index = columns.findIndex(item => item.key === anchor)
      columns.splice(index < 0 ? columns.length : index + (side === 'right' ? 1 : 0), 0, column)
      options.apply(columns, column)
      selectedColumn.value = column.key
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
    }
  }
  function insertColumn(anchor: string, side: 'left' | 'right') {
    if (!allowAddColumn.value)
      return
    error.value = ''
    const used = new Set([...options.columns().map(column => column.key), ...options.rows().flatMap(row => Object.keys(row))].map(key => key.toLowerCase()))
    let index = 1
    while (used.has(`custom_${index}`)) index++
    const key = `custom_${index}`
    addColumn({ key, title: `新列${index}`, type: 'string', defaultValue: '' }, anchor, side)
    if (!error.value)
      editingColumn.value = key
  }
  return { insertColumn, editingColumn, selectedColumn, error, allowAddColumn, addColumn }
}
