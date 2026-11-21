<script setup lang="ts">
import { addColorAlpha } from '@sa/color'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useThemeVars } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useThemeStore } from '@/store/modules/theme'
import { getUiFontSize } from '@/theme/typography'
import '@xterm/xterm/css/xterm.css'

interface Props {
  /** 输出标签和底部面板同时可见时，才初始化渲染与调整尺寸。 */
  active?: boolean
  /** 适配器名称 */
  adapterName?: string
  /** 活跃标签数 */
  activeTabsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  active: true,
  adapterName: '无',
  activeTabsCount: 0,
})

const themeVars = useThemeVars()
const themeStore = useThemeStore()
const terminalFontSize = computed(() => getUiFontSize(12, themeStore.fontSize))
const terminalTheme = computed(() => {
  const { surfaceColors: surface, themeColors: colors } = themeStore
  return {
    background: surface.layout,
    foreground: surface.text,
    cursor: surface.layout,
    selectionBackground: addColorAlpha(colors.primary, 0.3),
    black: surface.layout,
    red: colors.error,
    green: colors.success,
    yellow: colors.warning,
    blue: colors.primary,
    magenta: colors.info,
    cyan: colors.info,
    white: surface.text,
    brightBlack: surface.muted,
    brightRed: colors.error,
    brightGreen: colors.success,
    brightYellow: colors.warning,
    brightBlue: colors.primary,
    brightMagenta: colors.info,
    brightCyan: colors.info,
    brightWhite: surface.text,
  }
})
const terminalRef = ref<HTMLDivElement | null>(null)

let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null

/** 打印初始欢迎与状态信息 */
function printWelcomeInfo() {
  if (!term)
    return

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

defineExpose({
  appendLog,
  printWelcomeInfo,
})

let rafId: number | null = null

/** 仅测量可见容器；同一帧内合并尺寸变化，并保留阅读历史日志的位置。 */
function safeFit() {
  if (rafId !== null || !props.active || !term)
    return
  rafId = requestAnimationFrame(() => {
    rafId = null
    const host = terminalRef.value
    if (!props.active || !term || !host || !host.clientWidth || !host.clientHeight)
      return
    if (!term.element)
      term.open(host)
    const atBottom = term.buffer.active.viewportY === term.buffer.active.baseY
    fitAddon?.fit()
    if (atBottom)
      term.scrollToBottom()
  })
}

watch(
  () => props.active,
  (active) => {
    if (active)
      safeFit()
  },
  { flush: 'post' },
)

watch(terminalTheme, (theme) => {
  if (term)
    term.options.theme = theme
})

watch(terminalFontSize, (size) => {
  if (term) {
    term.options.fontSize = size
    safeFit()
  }
})

onMounted(() => {
  if (!terminalRef.value)
    return

  term = new Terminal({
    theme: terminalTheme.value,
    fontSize: terminalFontSize.value,
    fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    lineHeight: 1.4,
    cursorBlink: false,
    disableStdin: true,
    scrollback: 20000,
    convertEol: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  printWelcomeInfo()
  safeFit()

  // 监听容器大小变化实时平滑自适应 (经由 safeFit RAF 节流，不闪烁)
  resizeObserver = new ResizeObserver(() => {
    safeFit()
  })
  resizeObserver.observe(terminalRef.value)
})

onBeforeUnmount(() => {
  if (rafId !== null) {
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
    class="output-terminal-wrapper relative h-full w-full overflow-hidden bg-layout py-1 pl-2 pr-1"
    :style="{
      '--terminal-scrollbar-width': themeVars.scrollbarWidth,
      '--terminal-scrollbar-radius': themeVars.scrollbarBorderRadius,
      '--terminal-scrollbar-color': themeVars.scrollbarColor,
      '--terminal-scrollbar-color-hover': themeVars.scrollbarColorHover,
      '--terminal-scrollbar-bezier': themeVars.cubicBezierEaseInOut,
    }"
  >
    <div
      ref="terminalRef"
      class="h-full w-full"
    />
  </div>
</template>

<style scoped>
.output-terminal-wrapper :deep(.xterm) {
  height: 100%;
  padding: 0;
}

.output-terminal-wrapper :deep(.xterm-viewport) {
  background-color: transparent;
}

/* Keep xterm's geometry and auto-hide behavior; only the painted thumb is narrow. */
.output-terminal-wrapper :deep(.xterm-scrollable-element > .scrollbar.vertical > .slider) {
  background: transparent;
}

.output-terminal-wrapper :deep(.xterm-scrollable-element > .scrollbar.vertical > .slider::before) {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: var(--terminal-scrollbar-width);
  transform: translateX(-50%);
  border-radius: var(--terminal-scrollbar-radius);
  background-color: var(--terminal-scrollbar-color);
  pointer-events: none;
  transition: background-color 200ms var(--terminal-scrollbar-bezier);
}

.output-terminal-wrapper :deep(.xterm-scrollable-element > .scrollbar.vertical > .slider:hover::before),
.output-terminal-wrapper :deep(.xterm-scrollable-element > .scrollbar.vertical > .slider.active::before) {
  background-color: var(--terminal-scrollbar-color-hover);
}

.output-terminal-wrapper :deep(.xterm-scrollable-element > .scrollbar.invisible.fade) {
  transition: opacity 200ms var(--terminal-scrollbar-bezier);
}
</style>
