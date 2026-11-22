<script setup lang="ts">
import type { DataPath, PinDraft, PinKind, PinRow } from './pin-table.types'
import type { BusinessColumn, BusinessTableConfig, ColumnValue } from '@/core/table-columns'
import { SvgIcon, TableHeaderOperation } from '@sa/components'
import { NButton, NDataTable, NInput, NPopconfirm, NSelect } from 'naive-ui'
import { computed, h, onScopeDispose, shallowRef, watch } from 'vue'
import BusinessColumnHeader from '@/components/table/BusinessColumnHeader.vue'
import { isObject, readBusinessColumns, validColumnValue } from '@/core/table-columns'
import { useNaiveTable, useTableOperate } from '@/hooks/common/table'
import { useBusinessTableColumns } from '@/hooks/common/table-columns'
import { useTpStore } from '@/store/modules/tp'
import PinTableAddDialog from './PinTableAddDialog.vue'
import PinTableCell from './PinTableCell.vue'

defineOptions({ name: 'PinTableEditor' })
const props = defineProps<{
  data?: Record<string, unknown>
  dataPath?: (string | number)[]
  tableConfig?: BusinessTableConfig
}>()

const pinFields: BusinessColumn[] = [
  { key: 'groupName', title: 'Group Name', type: 'string', defaultValue: '' },
  { key: 'pinName', title: 'Pin Name', type: 'string', defaultValue: '' },
  { key: 'type', title: 'Type', type: 'string', defaultValue: '' },
  { key: 'comment', title: 'Comment', type: 'string', defaultValue: '' },
]

const store = useTpStore()
const search = shallowRef('')
const searchColumn = shallowRef('all')
const selectedKey = shallowRef<string>()
const revision = shallowRef(0)
const keys = new WeakMap<object, string>()
let nextKey = 0

// 工程数据使用 shallowRef；监听写入动作，避免深度代理整个工程。
const unsubscribe = store.$onAction(({ name, after }) => {
  if (name === 'updateItemField' || name === 'loadFile' || name === 'openProject')
    after(() => { revision.value++ })
}, true)
onScopeDispose(unsubscribe)

const source = computed(() => {
  void revision.value
  return props.data
})
const supportsColumns = computed(() => isObject(source.value)
  && (Array.isArray(source.value.individualPins) || Array.isArray(source.value.pinGroups)))
const canEdit = computed(() => {
  void revision.value
  const path = props.dataPath
  return path !== undefined && store.getItemData(path) === source.value && (isObject(source.value) || Array.isArray(source.value))
})
const allRows = computed<PinRow[]>(() => {
  void revision.value
  const data = source.value
  const base = props.dataPath ?? []
  const result: PinRow[] = []
  function append(cells: unknown, path: DataPath, mapKey?: string) {
    if (!isObject(cells))
      return
    let key = keys.get(cells)
    if (!key) {
      key = `pin-${++nextKey}`
      keys.set(cells, key)
    }
    result.push({
      key,
      number: result.length + 1,
      path,
      mapKey,
      cells,
      groupName: String(cells.groupName ?? ''),
      pinName: String(cells.pinName ?? mapKey ?? ''),
      type: String(cells.type ?? cells.pinType ?? ''),
      comment: String(cells.comment ?? ''),
    })
  }
  if (supportsColumns.value && isObject(data)) {
    for (const kind of ['individualPins', 'pinGroups'] as const) {
      const items = data[kind]
      if (Array.isArray(items))
        items.forEach((item, index) => append(item, [...base, kind, index]))
    }
  }
  else if (Array.isArray(data)) {
    data.forEach((item, index) => append(item, [...base, index]))
  }
  else if (isObject(data)) {
    for (const [key, value] of Object.entries(data))
      append(value, [...base, key], key)
  }
  return result
})
const rawRows = computed(() => allRows.value.map(row => row.cells))
const fields = computed(() => readBusinessColumns(supportsColumns.value && isObject(source.value) ? source.value : {}, pinFields, rawRows.value))
const rows = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query)
    return allRows.value
  const columns = searchColumn.value === 'all' ? fields.value : fields.value.filter(field => field.key === searchColumn.value)
  return allRows.value.filter(row => columns.some(column => String(
    pinFields.some(field => field.key === column.key) ? row[column.key as keyof PinDraft] : row.cells[column.key] ?? column.defaultValue,
  ).toLowerCase().includes(query)))
})

function updateCell(row: PinRow, field: string, value: ColumnValue) {
  const column = fields.value.find(column => column.key === field)
  const current = allRows.value.find(item => item.key === row.key)
  if (!canEdit.value || !current || !column || !validColumnValue(value, column.type) || (field === 'pinName' && !String(value).trim()))
    return
  if (current.cells[field] !== value)
    store.updateItemField(current.path, field, value)
}

function deleteRows(rowKeys: string[]) {
  if (!canEdit.value || !rowKeys.length)
    return
  const selected = new Set(rowKeys)
  const path = props.dataPath!
  const data = source.value
  if (supportsColumns.value && isObject(data)) {
    for (const kind of ['individualPins', 'pinGroups'] as const) {
      const items = data[kind]
      const indices = new Set(allRows.value.filter(row => selected.has(row.key) && row.path[path.length] === kind).map(row => row.path.at(-1)))
      if (Array.isArray(items) && indices.size)
        store.updateItemField(path, kind, items.filter((_, index) => !indices.has(index)))
    }
  }
  else if (path.length) {
    const removed = new Set(allRows.value.filter(row => selected.has(row.key)).map(row => row.path.at(-1)))
    const value = Array.isArray(data) ? data.filter((_, index) => !removed.has(index)) : Object.fromEntries(Object.entries(data ?? {}).filter(([key]) => !removed.has(key)))
    store.updateItemField(path.slice(0, -1), String(path.at(-1)), value)
  }
  if (selectedKey.value && selected.has(selectedKey.value))
    selectedKey.value = undefined
}

function addRow(draft: PinDraft, kind: PinKind) {
  if (!canEdit.value || !supportsColumns.value)
    return
  if (!draft.pinName.trim() || (kind === 'pinGroups' && !draft.groupName.trim()))
    throw new Error('请填写 Pin Name；分组管脚还需要 Group Name')
  const data = source.value as Record<string, unknown>
  const defaults = Object.fromEntries(fields.value.map(field => [field.key, field.defaultValue]))
  const existing = Array.isArray(data[kind]) ? data[kind] : []
  store.updateItemField(props.dataPath!, kind, [...existing, { ...defaults, ...draft, pinName: draft.pinName.trim() }])
}

function applyColumns(columns: BusinessColumn[], added: BusinessColumn) {
  if (!canEdit.value || !supportsColumns.value)
    return
  const path = props.dataPath!
  const data = source.value as Record<string, unknown>
  // 保留原始行对象与键，只补充新字段；统一通过 Store 记录修改。
  for (const row of allRows.value)
    store.updateItemField(row.path, added.key, added.defaultValue)
  store.updateItemField(path, 'metadata', { ...(isObject(data.metadata) ? data.metadata : {}), tableColumns: columns })
}

function renameColumn(key: string, title: string) {
  if (!canEdit.value || !supportsColumns.value || pinFields.some(field => field.key === key) || !title.trim())
    return
  const data = source.value as Record<string, unknown>
  const columns = fields.value.map(column => column.key === key ? { ...column, title: title.trim() } : column)
  store.updateItemField(props.dataPath!, 'metadata', { ...(isObject(data.metadata) ? data.metadata : {}), tableColumns: columns })
}
const searchOptions = computed(() => [{ label: 'All Columns', value: 'all' }, ...fields.value.map(field => ({ label: field.title, value: field.key }))])
const { selectedColumn, error: columnError, allowAddColumn, insertColumn, editingColumn } = useBusinessTableColumns({
  config: () => ({ allowAddColumn: props.tableConfig?.allowAddColumn === true && canEdit.value && supportsColumns.value }),
  columns: () => {
    const order = columnChecks.value.map(column => column.key)
    return [...fields.value].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
  },
  rows: () => rawRows.value,
  apply: applyColumns,
})
const pinTypes = ['Input', 'Output', 'I/O', 'Power', 'Ground', 'Analog', 'Digital', 'BIDIR', 'RF']

function renderCell(row: PinRow, column: BusinessColumn) {
  const field = column.key
  const value = pinFields.some(item => item.key === field) ? row[field as keyof typeof row] : row.cells[field]
  return h(PinTableCell, {
    value: (value ?? column.defaultValue) as ColumnValue,
    valueType: column.type,
    label: `${column.title} ${row.number}`,
    disabled: !canEdit.value,
    required: field === 'pinName',
    options: field === 'type' ? [...new Set([...pinTypes, row.type].filter(Boolean))].map(value => ({ label: value, value })) : column.type === 'boolean' ? [{ label: 'false', value: 'false' }, { label: 'true', value: 'true' }] : undefined,
    onActivate: () => {
      selectedKey.value = row.key
      selectedColumn.value = field
    },
    onUpdate: (value: ColumnValue) => updateCell(row, field, value),
  })
}

const { columns, data: tableRows, scrollX, columnChecks, loading, getData, reloadColumns } = useNaiveTable<PinRow[], PinRow>({
  api: async () => rows.value,
  transform: result => result,
  immediate: false,
  columns: () => [
    { type: 'selection', width: 42, disabled: () => !canEdit.value },
    { key: 'number', title: '#', width: 52, align: 'center' },
    ...fields.value.map(field => ({
      key: field.key,
      title: () => h(BusinessColumnHeader, {
        column: field,
        allowAdd: allowAddColumn.value,
        selected: selectedColumn.value === field.key,
        editing: editingColumn.value === field.key,
        canRename: !pinFields.some(column => column.key === field.key),
        onSelect: () => { selectedColumn.value = field.key },
        onInsert: (side: 'left' | 'right') => insertColumn(field.key, side),
        onRename: (title: string) => renameColumn(field.key, title),
        onFinish: () => { editingColumn.value = undefined },
      }),
      width: field.key === 'comment' ? 280 : 180,
      render: (row: PinRow) => renderCell(row, field),
    })),
    {
      key: 'operate',
      title: '操作',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: row => h(NPopconfirm, { onPositiveClick: () => remove([row.key]) }, {
        default: () => `确认删除管脚 ${row.pinName}？`,
        trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true, disabled: !canEdit.value }, { default: () => '删除' }),
      }),
    },
  ],
})
// 列设置只展示名称，并保留组件库原本可写的勾选/固定状态。
watch(columnChecks, (checks) => {
  for (const check of checks) {
    const field = fields.value.find(field => field.key === check.key)
    if (field)
      check.title = field.title
  }
}, { immediate: true })
watch(() => JSON.stringify(fields.value), () => {
  const previous = columnChecks.value
  reloadColumns()
  // 值变化不重建列；仅重命名时也保留用户在列设置中调整的顺序。
  if (previous.length === columnChecks.value.length && previous.every(item => columnChecks.value.some(column => column.key === item.key))) {
    const updated = new Map(columnChecks.value.map(column => [column.key, column]))
    columnChecks.value = previous.map(column => updated.get(column.key)!)
  }
})
const { checkedRowKeys, drawerVisible, handleAdd } = useTableOperate(tableRows, 'key', getData)
watch(rows, (value) => {
  tableRows.value = value
}, { immediate: true })
watch(allRows, () => {
  checkedRowKeys.value = []
})

function remove(keys: string[]) {
  deleteRows(keys)
  checkedRowKeys.value = []
}
function submitAdd(draft: PinDraft, kind: 'individualPins' | 'pinGroups') {
  try {
    addRow(draft, kind)
    drawerVisible.value = false
  }
  catch (error) {
    window.$message?.error(error instanceof Error ? error.message : String(error))
  }
}
</script>

<template>
  <section class="pin-table-editor min-w-0 select-text p-12px text-base-text" aria-label="Pin Table">
    <div class="mb-12px flex flex-wrap items-center justify-between gap-12px">
      <h2 class="font-600 text-ui-14">
        PIN TABLE
      </h2>
      <TableHeaderOperation v-model:columns="columnChecks" :disabled-delete="!checkedRowKeys.length" :loading="loading" @add="handleAdd" @delete="remove(checkedRowKeys)" @refresh="getData" />
    </div>
    <div class="mb-12px flex flex-wrap items-center gap-8px">
      <NSelect v-model:value="searchColumn" :options="searchOptions" size="small" class="w-160px" :consistent-menu-width="false" aria-label="搜索列" />
      <NInput v-model:value="search" clearable size="small" placeholder="Search..." :input-props="{ 'aria-label': '搜索管脚' }" class="max-w-320px min-w-160px flex-1">
        <template #prefix>
          <SvgIcon icon="ri:search-line" />
        </template>
      </NInput>
    </div>
    <NDataTable
      v-model:checked-row-keys="checkedRowKeys"
      :columns="columns"
      :data="tableRows"
      :row-key="(row: PinRow) => row.key"
      :row-class-name="(row: PinRow) => row.key === selectedKey ? 'pin-row-selected' : ''"
      :row-props="(row: PinRow) => ({ 'onClick': () => { selectedKey = row.key }, 'aria-selected': row.key === selectedKey })"
      :scroll-x="scrollX"
      :single-line="false"
      :bordered="true"
      size="small"
    >
      <template #empty>
        {{ search ? '没有匹配的管脚' : '暂无管脚数据' }}
      </template>
    </NDataTable>
    <PinTableAddDialog v-model:show="drawerVisible" @submit="submitAdd" />
    <p v-if="columnError" role="alert" class="mt-8px text-error">
      {{ columnError }}
    </p>
  </section>
</template>

<style scoped>
.pin-table-editor :deep(.n-data-table-td) { padding: 0; }
.pin-table-editor :deep(.pin-row-selected .n-data-table-td) {
  background-color: var(--n-td-color-checked);
}
.pin-table-editor :deep(.pin-row-selected .n-data-table-td:first-child) {
  box-shadow: inset 3px 0 0 rgb(var(--primary-color));
}
</style>
