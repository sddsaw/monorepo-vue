<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { RedisConnectionState, RedisDevtoolsRow } from '@/service/redis/types'
import { SvgIcon } from '@sa/components'
import dayjs from 'dayjs'
import { NButton, NDataTable, NEmpty, NInput, NSelect, NSwitch, NTabPane, NTabs, NTag, useMessage } from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { isMacOS, isTauri } from '@/plugins/tauri'
import { createDefaultTransport } from '@/service/redis/transport'
import { emitAppEvent, useAppEventListener } from '@/services/events'
import { closeCurrentWindow } from '@/services/ipc'

defineOptions({
  name: 'RedisDevtools',
})

type KindFilter = 'all' | 'rpc' | 'push' | 'error'

const MAX_ROWS = 2000

const isDev = import.meta.env.DEV
const message = useMessage()
const isMac = isMacOS()
const showWindowControls = isTauri() && !isMac

// ---------------- 数据存储（rAF 合并刷新，避免高频推送卡顿） ----------------
const rowMap = new Map<string, RedisDevtoolsRow>()
const allRows = shallowRef<RedisDevtoolsRow[]>([])
let flushScheduled = false

function scheduleFlush() {
  if (flushScheduled)
    return
  flushScheduled = true
  requestAnimationFrame(() => {
    flushScheduled = false
    allRows.value = [...rowMap.values()].reverse()
  })
}

function upsertRow(row: RedisDevtoolsRow) {
  rowMap.set(row.key, row)
  if (rowMap.size > MAX_ROWS) {
    const oldestKey = rowMap.keys().next().value
    if (oldestKey !== undefined)
      rowMap.delete(oldestKey)
  }
  scheduleFlush()
}

// ---------------- 工具栏状态 ----------------
const paused = ref(false)
const keyword = ref('')
const kindFilter = ref<KindFilter>('all')
const kindOptions = [
  { label: '全部', value: 'all' },
  { label: 'RPC 请求', value: 'rpc' },
  { label: '推送', value: 'push' },
  { label: '仅失败', value: 'error' },
]

const filteredRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return allRows.value.filter((row) => {
    if (kindFilter.value === 'error' && row.status !== 'error')
      return false
    if ((kindFilter.value === 'rpc' || kindFilter.value === 'push') && row.kind !== kindFilter.value)
      return false
    if (kw && !`${row.name} ${row.key} ${row.source}`.toLowerCase().includes(kw))
      return false
    return true
  })
})

const stats = computed(() => {
  const rows = allRows.value
  return {
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    error: rows.filter(r => r.status === 'error').length,
  }
})

function handleClear() {
  rowMap.clear()
  selectedKey.value = null
  scheduleFlush()
}

// ---------------- 连接状态 ----------------
const connectionState = ref<RedisConnectionState | 'unknown'>('unknown')
const stateTagMap: Record<RedisConnectionState | 'unknown', { label: string, type: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  unknown: { label: '未知', type: 'default' },
  idle: { label: '未初始化', type: 'default' },
  connecting: { label: '连接中', type: 'info' },
  connected: { label: '已连接', type: 'success' },
  reconnecting: { label: '重连中', type: 'warning' },
  disconnected: { label: '已断开', type: 'error' },
}
let unlistenState: (() => void) | null = null

// ---------------- 表格 ----------------
const selectedKey = ref<string | null>(null)
const selectedRow = computed(() => (selectedKey.value ? rowMap.get(selectedKey.value) ?? null : null))
// 依赖 allRows 以便选中行的状态更新后详情同步刷新
const detailRow = computed(() => {
  void allRows.value
  return selectedRow.value
})

const statusTag = {
  pending: { label: '等待中', type: 'info' },
  success: { label: '成功', type: 'success' },
  error: { label: '失败', type: 'error' },
} as const

const columns: DataTableColumns<RedisDevtoolsRow> = [
  {
    title: '时间',
    key: 'startedAt',
    width: 110,
    render: row => dayjs(row.startedAt).format('HH:mm:ss.SSS'),
  },
  {
    title: '类型',
    key: 'kind',
    width: 80,
    render: row => (row.kind === 'rpc' ? '⇅ RPC' : '⚡ 推送'),
  },
  {
    title: '名称',
    key: 'name',
    ellipsis: { tooltip: true },
  },
  {
    title: 'requestId',
    key: 'key',
    width: 120,
    ellipsis: { tooltip: true },
    render: row => (row.kind === 'rpc' ? row.key.slice(0, 8) : '-'),
  },
  {
    title: '窗口',
    key: 'source',
    width: 90,
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => {
      const tag = statusTag[row.status]
      const label = row.error ? `${tag.label} · ${row.error.type}` : tag.label
      return h(NTag, { size: 'small', type: tag.type, bordered: false }, { default: () => label })
    },
  },
  {
    title: '耗时',
    key: 'duration',
    width: 80,
    render: row => (row.duration === undefined ? '-' : `${row.duration} ms`),
  },
]

function rowProps(row: RedisDevtoolsRow) {
  return {
    style: 'cursor: pointer;',
    onClick: () => {
      selectedKey.value = row.key
      replayText.value = stringify(row.request)
    },
  }
}

function rowClassName(row: RedisDevtoolsRow) {
  if (row.key === selectedKey.value)
    return 'redis-devtools-row--selected'
  return row.status === 'error' ? 'redis-devtools-row--error' : ''
}

// ---------------- 详情 / 复制 / 重放 ----------------
function stringify(value: unknown): string {
  if (value === undefined)
    return ''
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}

async function handleCopy(value: unknown) {
  try {
    await navigator.clipboard.writeText(stringify(value))
    message.success('已复制')
  }
  catch {
    message.error('复制失败')
  }
}

const replayText = ref('')

async function handleReplay() {
  const row = detailRow.value
  if (!row || row.kind !== 'rpc')
    return
  let params: unknown
  try {
    params = replayText.value.trim() ? JSON.parse(replayText.value) : undefined
  }
  catch {
    message.error('参数不是合法的 JSON')
    return
  }
  await emitAppEvent('redis-devtools:replay', { method: row.name, params })
  message.info(`已重放 ${row.name}`)
}

// ---------------- 事件订阅 ----------------
useAppEventListener('redis-devtools:row', (row) => {
  if (!paused.value)
    upsertRow(row)
})

useAppEventListener('redis-devtools:snapshot', ({ rows }) => {
  rows.forEach(row => rowMap.set(row.key, row))
  // 快照与实时记录交错到达时按时间重新排序
  const sorted = [...rowMap.values()].sort((a, b) => a.startedAt - b.startedAt)
  rowMap.clear()
  sorted.slice(-MAX_ROWS).forEach(row => rowMap.set(row.key, row))
  scheduleFlush()
})

onMounted(async () => {
  if (!isDev)
    return
  await emitAppEvent('redis-devtools:sync', undefined)
  unlistenState = await createDefaultTransport().onState((state) => {
    connectionState.value = state
  })
})

onUnmounted(() => {
  unlistenState?.()
})
</script>

<template>
  <div class="h-full w-full flex flex-col bg-white text-slate-800 dark:bg-[#101014] dark:text-zinc-200">
    <!-- 标题栏 -->
    <div
      data-tauri-drag-region
      class="h-9 flex shrink-0 select-none items-center justify-between border-b border-black/[0.06] px-3 dark:border-white/[0.06]"
      :class="[isTauri() && isMac ? 'pl-[76px]' : '']"
    >
      <div class="pointer-events-none flex items-center gap-1.5 text-xs font-medium">
        <SvgIcon icon="devicon:redis" class="text-sm" />
        <span>Redis 调试面板</span>
        <NTag size="tiny" :type="stateTagMap[connectionState].type" :bordered="false">
          {{ stateTagMap[connectionState].label }}
        </NTag>
      </div>
      <button
        v-if="showWindowControls"
        type="button"
        title="关闭"
        class="h-6 w-6 flex items-center justify-center rounded hover:bg-red-500 hover:text-white"
        @click.stop="closeCurrentWindow"
      >
        <SvgIcon icon="carbon:close" class="text-sm" />
      </button>
    </div>

    <NEmpty v-if="!isDev" class="m-auto" description="调试面板仅在开发模式下可用" />

    <template v-else>
      <!-- 工具栏 -->
      <div class="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.06]">
        <NInput v-model:value="keyword" size="small" clearable placeholder="过滤 method / topic / requestId / 窗口" class="max-w-80" />
        <NSelect v-model:value="kindFilter" size="small" :options="kindOptions" class="w-28" />
        <div class="flex items-center gap-1 text-xs">
          <NSwitch v-model:value="paused" size="small" />
          <span>暂停记录</span>
        </div>
        <NButton size="small" secondary @click="handleClear">
          清空
        </NButton>
        <div class="ml-auto text-xs text-slate-500 dark:text-zinc-400">
          共 {{ stats.total }} 条 · 等待中 {{ stats.pending }} · 失败 {{ stats.error }}
        </div>
      </div>

      <!-- 主体 -->
      <div class="min-h-0 flex flex-1">
        <div class="min-w-0 flex-1">
          <NDataTable
            size="small"
            :columns="columns"
            :data="filteredRows"
            :row-key="(row: RedisDevtoolsRow) => row.key"
            :row-props="rowProps"
            :row-class-name="rowClassName"
            virtual-scroll
            flex-height
            class="h-full"
          />
        </div>

        <div v-if="detailRow" class="w-[42%] flex flex-col border-l border-black/[0.06] dark:border-white/[0.06]">
          <div class="flex shrink-0 items-center justify-between px-3 py-2 text-xs">
            <span class="truncate font-medium">{{ detailRow.name }}</span>
            <NButton text size="tiny" @click="selectedKey = null">
              <SvgIcon icon="carbon:close" />
            </NButton>
          </div>
          <div class="truncate px-3 pb-2 text-[11px] text-slate-500 font-mono dark:text-zinc-400">
            {{ detailRow.kind === 'rpc' ? `requestId: ${detailRow.key}` : `topic: ${detailRow.name}` }}
          </div>
          <NTabs type="line" size="small" class="min-h-0 flex-1 px-3" pane-class="min-h-0 overflow-auto">
            <NTabPane v-if="detailRow.kind === 'rpc'" name="request" tab="请求">
              <NButton size="tiny" secondary class="mb-2" @click="handleCopy(detailRow.request)">
                复制
              </NButton>
              <pre class="redis-devtools-json">{{ stringify(detailRow.request) || '（无参数）' }}</pre>
            </NTabPane>
            <NTabPane name="response" :tab="detailRow.kind === 'rpc' ? '响应' : '推送数据'">
              <template v-if="detailRow.error">
                <div class="mb-2 text-xs text-red-500">
                  [{{ detailRow.error.type }}{{ detailRow.error.code ? ` · ${detailRow.error.code}` : '' }}] {{ detailRow.error.message }}
                </div>
              </template>
              <template v-else-if="detailRow.status === 'pending'">
                <div class="text-xs text-slate-500">
                  等待响应中...
                </div>
              </template>
              <template v-else>
                <NButton size="tiny" secondary class="mb-2" @click="handleCopy(detailRow.response)">
                  复制
                </NButton>
                <pre class="redis-devtools-json">{{ stringify(detailRow.response) || '（无数据）' }}</pre>
              </template>
            </NTabPane>
            <NTabPane v-if="detailRow.kind === 'rpc'" name="replay" tab="重放">
              <div class="mb-2 text-[11px] text-slate-500 dark:text-zinc-400">
                编辑参数（JSON）后由主窗口重新发送，结果会作为新记录出现在列表中
              </div>
              <NInput v-model:value="replayText" type="textarea" :autosize="{ minRows: 8, maxRows: 20 }" class="font-mono" />
              <NButton size="small" type="primary" class="mt-2" @click="handleReplay">
                发送
              </NButton>
            </NTabPane>
          </NTabs>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.redis-devtools-json {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

:deep(.redis-devtools-row--error td) {
  color: #e5484d;
}

:deep(.redis-devtools-row--selected td) {
  background-color: rgba(0, 122, 204, 0.12) !important;
}
</style>
