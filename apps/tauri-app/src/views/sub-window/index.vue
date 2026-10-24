<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { useEventListener } from '@vueuse/core'
import { NButton, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { logger } from '@/plugins/logger'
import { isMacOS, isTauri } from '@/plugins/tauri'
import { emitAppEvent, useAppEventListener } from '@/services/events'
import {
  closeCurrentWindow,
  isCurrentWindowMaximized,
  minimizeCurrentWindow,
  toggleCurrentWindowMaximize,
} from '@/services/ipc'

const message = useMessage()
const timeStr = ref(new Date().toLocaleTimeString())
const isMaximized = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const isMac = computed(() => isMacOS())
const showWindowControls = computed(() => isTauri() && !isMac.value)

async function checkMaximized() {
  if (!isTauri())
    return
  try {
    isMaximized.value = await isCurrentWindowMaximized()
  }
  catch {}
}

useEventListener(window, 'resize', checkMaximized)

async function handleMinimize() {
  await minimizeCurrentWindow()
}

async function handleToggleMaximize() {
  isMaximized.value = await toggleCurrentWindowMaximize()
}

const inputMsg = ref('Hello from SubWindow!')
const messages = ref<Array<{ from: string, content: string, time: string, isSelf: boolean }>>([
  {
    from: '系统通知',
    content: '子窗口已启动，正在监听主窗口跨进程广播...',
    time: new Date().toLocaleTimeString(),
    isSelf: false,
  },
])

onMounted(() => {
  checkMaximized()
  timer = setInterval(() => {
    timeStr.value = new Date().toLocaleTimeString()
  }, 1000)
  logger.info('子窗口初始化成功')
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

// 监听来自其他窗口的广播
useAppEventListener('window:message', (payload) => {
  messages.value.push({
    from: payload.from,
    content: payload.content,
    time: new Date().toLocaleTimeString(),
    isSelf: false,
  })
  message.info(`收到来自 [${payload.from}] 的广播`)
})

async function handleSendMessage() {
  if (!inputMsg.value.trim())
    return

  const text = inputMsg.value.trim()
  messages.value.push({
    from: '本机 (子窗口)',
    content: text,
    time: new Date().toLocaleTimeString(),
    isSelf: true,
  })

  await emitAppEvent('window:message', {
    from: '子窗口 (SubWindow)',
    content: text,
  })

  inputMsg.value = ''
  message.success('广播发送成功')
}

async function handleCloseSelf() {
  await closeCurrentWindow()
}
</script>

<template>
  <div class="h-full flex flex-col bg-[#f8fafc] text-slate-800 dark:bg-[#121215] dark:text-zinc-100">
    <!-- 顶部原生拖拽安全标题栏（兼容 macOS 红绿灯内边距与 Windows/Linux 自绘控制按钮） -->
    <div
      data-tauri-drag-region
      class="h-9 flex shrink-0 select-none items-center justify-between border-b border-black/[0.05] px-3 dark:border-white/[0.05]"
      :class="[isTauri() && isMac ? 'pl-[76px]' : '']"
    >
      <div class="pointer-events-none flex items-center gap-1.5 text-xs text-slate-500 font-medium dark:text-zinc-400">
        <SvgIcon icon="carbon:window-overlay" class="text-sm text-[#646cff]" />
        <span>独立子窗口 · 数据与通信面板</span>
      </div>

      <!-- Windows / Linux 无边框子窗口控制按钮 -->
      <div v-if="showWindowControls" class="flex items-center gap-1">
        <button
          type="button"
          title="最小化"
          class="h-6 w-6 flex items-center justify-center rounded text-slate-500 transition-colors active:scale-95 hover:bg-black/5 dark:text-zinc-400 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          @click.stop="handleMinimize"
        >
          <SvgIcon icon="carbon:subtract" class="text-xs" />
        </button>
        <button
          type="button"
          :title="isMaximized ? '还原' : '最大化'"
          class="h-6 w-6 flex items-center justify-center rounded text-slate-500 transition-colors active:scale-95 hover:bg-black/5 dark:text-zinc-400 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          @click.stop="handleToggleMaximize"
        >
          <SvgIcon :icon="isMaximized ? 'carbon:center-to-fit' : 'carbon:maximize'" class="text-xs" />
        </button>
        <button
          type="button"
          title="关闭"
          class="h-6 w-6 flex items-center justify-center rounded text-slate-500 transition-colors active:scale-95 hover:bg-red-500 dark:text-zinc-400 hover:text-white dark:hover:bg-red-500 dark:hover:text-white"
          @click.stop="handleCloseSelf"
        >
          <SvgIcon icon="carbon:close" class="text-sm" />
        </button>
      </div>
    </div>

    <!-- 窗口主体内容区 -->
    <div class="flex-1 overflow-y-auto p-3">
      <div class="h-full w-full flex flex-col justify-between space-y-3">
        <!-- 头部状态栏卡片 -->
        <div class="border border-black/[0.06] rounded-xl bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#18181c]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 flex items-center justify-center border border-[#646cff]/20 rounded-lg from-[#646cff]/10 to-[#818cf8]/10 bg-gradient-to-br text-[#646cff]">
                <SvgIcon icon="carbon:window-overlay" class="text-xl" />
              </div>
              <div>
                <div class="flex items-center gap-1">
                  <h2 class="text-sm text-slate-900 font-bold dark:text-zinc-100">
                    原生独立子窗口
                  </h2>
                  <span class="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
                </div>
                <p class="text-[11px] text-slate-400 dark:text-zinc-400">
                  独立进程渲染上下文 · 内存隔离
                </p>
              </div>
            </div>

            <!-- 时间胶囊 -->
            <div class="border border-black/[0.05] rounded-lg bg-slate-50 px-2 py-1 text-xs text-[#646cff] font-mono dark:border-white/[0.05] dark:bg-zinc-800 dark:text-[#818cf8]">
              {{ timeStr }}
            </div>
          </div>
        </div>

        <!-- 消息交互中心 -->
        <div class="flex flex-col flex-1 border border-black/[0.06] rounded-xl bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#18181c]">
          <div class="mb-3 flex items-center justify-between border-b border-black/[0.05] pb-2 dark:border-white/[0.05]">
            <span class="text-xs text-slate-700 font-bold dark:text-zinc-200">跨窗口实时事件总线</span>
            <span class="text-[10px] text-slate-400">Event Bus Demo</span>
          </div>

          <!-- 消息列表 -->
          <div class="max-h-56 flex-1 overflow-y-auto pr-1 space-y-2">
            <div
              v-for="(msg, idx) in messages"
              :key="idx"
              class="flex flex-col"
              :class="msg.isSelf ? 'items-end' : 'items-start'"
            >
              <div class="mb-0.5 text-[10px] text-slate-400">
                {{ msg.from }} · {{ msg.time }}
              </div>
              <div
                class="shadow-2xs max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed"
                :class="msg.isSelf
                  ? 'bg-[#646cff] text-white rounded-br-none'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-bl-none'"
              >
                {{ msg.content }}
              </div>
            </div>
          </div>

          <!-- 底部输入胶囊 -->
          <div class="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
            <input
              v-model="inputMsg"
              type="text"
              class="h-8.5 flex-1 border border-black/[0.08] rounded-lg bg-slate-50 px-3 text-xs text-slate-800 outline-none transition-all dark:border-white/[0.08] focus:border-[#646cff] dark:bg-zinc-800/80 focus:bg-white dark:text-zinc-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#646cff]/15 dark:focus:border-[#818cf8] dark:focus:bg-zinc-800 dark:placeholder:text-zinc-500"
              placeholder="输入广播内容并回车..."
              @keyup.enter="handleSendMessage"
            >
            <NButton
              type="primary"
              @click="handleSendMessage"
            >
              <template #icon>
                <SvgIcon icon="carbon:send-alt" />
              </template>
              发送
            </NButton>
          </div>
        </div>

        <!-- 底部操作条：关闭窗口 -->
        <NButton
          type="error"
          secondary
          block
          @click="handleCloseSelf"
        >
          <template #icon>
            <SvgIcon icon="carbon:close" />
          </template>
          关闭当前子窗口
        </NButton>
      </div>
    </div>
  </div>
</template>
