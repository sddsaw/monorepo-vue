<script setup lang="ts">
import type { DropdownOption } from 'naive-ui'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { NDropdown, useMessage } from 'naive-ui'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import '@xterm/xterm/css/xterm.css'

interface Props {
  /** 当前父级激活的 Tab 名称，用于切回时触发 fit */
  activeTab?: string
  /** 是否正在手动拖拽拉伸面板大小 */
  isResizing?: boolean
  /** 适配器名称 */
  adapterName?: string
  /** 活跃标签数 */
  activeTabsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'output',
  isResizing: false,
  adapterName: '无',
  activeTabsCount: 0,
})

const message = useMessage()
const terminalRef = ref<HTMLDivElement | null>(null)

let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null

// --- 右键菜单相关 ---
const showDropdown = ref(false)
const dropdownX = ref(0)
const dropdownY = ref(0)
const dropdownOptions = ref<DropdownOption[]>([])

/** 复制文本到剪贴板 */
async function copyToClipboard(text: string) {
  if (!text)
    return
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  }
  catch {
    message.error('复制失败，请检查浏览器剪贴板权限')
  }
}

/** 弹出右键菜单 */
function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  if (!term)
    return

  const hasSelection = term.hasSelection()
  const selectedText = term.getSelection()

  dropdownOptions.value = [
    {
      label: '复制 (Copy)',
      key: 'copy',
      disabled: !hasSelection,
    },
    {
      label: '全选 (Select All)',
      key: 'selectAll',
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      label: '清空输出 (Clear)',
      key: 'clear',
    },
  ]

  dropdownX.value = e.clientX
  dropdownY.value = e.clientY
  showDropdown.value = true

  // 临时暂存当前选中文本以便点击菜单时使用
  currentSelectedText = selectedText
}

let currentSelectedText = ''

function handleSelectDropdown(key: string) {
  showDropdown.value = false
  if (!term)
    return

  switch (key) {
    case 'copy':
      if (currentSelectedText) {
        copyToClipboard(currentSelectedText)
      }
      break
    case 'selectAll':
      term.selectAll()
      break
    case 'clear':
      term.clear()
      break
  }
}

/** 打印初始欢迎与状态信息 */
function printWelcomeInfo() {
  if (!term)
    return

  term.clear()
  term.writeln('')
  term.writeln(
    ` \x1B[90mATE Studio 核心解析引擎版本:\x1B[0m \x1B[42;97m 1.0.0 \x1B[0m`,
  )
  term.writeln('')
  term.writeln(
    ` \x1B[90m当前匹配适配器:\x1B[0m \x1B[44;97m ${props.adapterName || 'ATE 测试流程与测试项适配器'} \x1B[0m`,
  )
  term.writeln('')
  term.writeln(
    ` \x1B[90m已打开模块项:\x1B[0m \x1B[37m${props.activeTabsCount} 个活跃编辑标签页\x1B[0m`,
  )
  term.writeln('')
  term.writeln(' \x1B[90m------------------------------------------------------------\x1B[0m')
}

/** 外部可调用的写入方法 */
function appendLog(line: string) {
  if (term) {
    term.writeln(line)
  }
}

function clearLog() {
  if (term) {
    term.clear()
  }
}

defineExpose({
  appendLog,
  clearLog,
  printWelcomeInfo,
})

let rafId: number | null = null

/** 带节流与安全捕获的尺寸自适应函数 */
function safeFit() {
  if (rafId) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    rafId = null
    try {
      fitAddon?.fit()
      term?.scrollToBottom()
    }
    catch {
      // 忽略尺寸为 0 时的计算异常
    }
  })
}

// 监听 Tab 切换，切回 Output 时重新计算终端尺寸
watch(
  () => props.activeTab,
  (val) => {
    if (val === 'output') {
      nextTick(() => {
        safeFit()
        setTimeout(safeFit, 60)
      })
    }
  },
)

onMounted(() => {
  if (!terminalRef.value)
    return

  term = new Terminal({
    theme: {
      background: '#181818',
      foreground: '#d4d4d4',
      cursor: '#181818',
      selectionBackground: 'rgba(56, 139, 253, 0.4)',
      black: '#000000',
      red: '#f43f5e',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#e5e7eb',
      brightBlack: '#6b7280',
      brightRed: '#fb7185',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff',
    },
    fontSize: 12,
    fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    lineHeight: 1.4,
    cursorBlink: false,
    disableStdin: true,
    scrollback: 20000,
    convertEol: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  term.open(terminalRef.value)

  // 快捷键 Ctrl+C / Cmd+C 复制选中文本
  term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && term?.hasSelection()) {
      const selected = term.getSelection()
      if (selected) {
        copyToClipboard(selected)
      }
      return false
    }
    return true
  })

  try {
    fitAddon.fit()
  }
  catch {
    // 容器未可见时安全降级
  }
  printWelcomeInfo()
  safeFit()

  // 监听容器大小变化实时平滑自适应 (经由 safeFit RAF 节流，不闪烁)
  resizeObserver = new ResizeObserver(() => {
    safeFit()
  })
  resizeObserver.observe(terminalRef.value)
})

onBeforeUnmount(() => {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  term?.dispose()
  term = null
  fitAddon = null
})
</script>

<template>
  <div
    class="output-terminal-wrapper relative h-full w-full overflow-hidden bg-[#181818]"
    @contextmenu="handleContextMenu"
  >
    <div
      ref="terminalRef"
      class="h-full w-full pl-2 pr-1 py-1"
    />

    <!-- 右键菜单 -->
    <NDropdown
      placement="bottom-start"
      trigger="manual"
      :x="dropdownX"
      :y="dropdownY"
      :options="dropdownOptions"
      :show="showDropdown"
      :on-clickoutside="() => (showDropdown = false)"
      @select="handleSelectDropdown"
    />
  </div>
</template>

<style>
/* 注意：不能加 scoped，Vue scoped 生成的 [data-v-xxx] 属性选择器会导致浏览器判定 ::-webkit-scrollbar 非法并丢弃规则 */
.output-terminal-wrapper .xterm {
  height: 100%;
  padding: 0;
}

.output-terminal-wrapper .xterm-viewport {
  background-color: #181818 !important;
  scrollbar-width: thin !important;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent !important;
}

/* 1:1 复刻 Naive UI NScrollbar 滚动条视觉与交互规范 */
.output-terminal-wrapper .xterm-viewport::-webkit-scrollbar {
  width: 5px !important;
  height: 5px !important;
  background-color: transparent !important;
}

.output-terminal-wrapper .xterm-viewport::-webkit-scrollbar-track {
  background: transparent !important;
  background-color: transparent !important;
}

.output-terminal-wrapper .xterm-viewport::-webkit-scrollbar-corner {
  background: transparent !important;
}

.output-terminal-wrapper .xterm-viewport::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2) !important;
  border-radius: 9999px !important;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.output-terminal-wrapper .xterm-viewport::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.38) !important;
}
</style>
