<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { closeCurrentWindow } from '../services/ipc'

const timeStr = ref(new Date().toLocaleTimeString())
let timer: any = null

onMounted(() => {
  timer = setInterval(() => {
    timeStr.value = new Date().toLocaleTimeString()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

async function handleCloseSelf() {
  await closeCurrentWindow()
}
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center p-8 text-center select-none bg-[#f8fafc] text-[#1e293b] dark:bg-[#121214] dark:text-[#f1f5f9]">
    <div class="max-w-md w-full rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-md space-y-4 dark:border-[#27272a] dark:bg-[#18181c]">
      <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-500/10 text-2xl text-blue-500">
        🪟
      </div>

      <h2 class="text-xl font-bold">
        这是独立打开的原生子窗口
      </h2>

      <p class="text-xs text-[#64748b] leading-relaxed dark:text-[#94a3b8]">
        拥有独立的 Webview 渲染上下文与操作系统窗口实例。采用 Vue Router Hash 路由（/#/sub-window）驱动，支持多屏协同与独立缩放。
      </p>

      <div class="rounded-xl bg-gray-500/5 px-4 py-3 font-mono text-sm text-blue-500">
        当前时间：{{ timeStr }}
      </div>

      <div class="pt-2">
        <NButton type="error" secondary block @click="handleCloseSelf">
          关闭当前子窗口 (closeCurrentWindow)
        </NButton>
      </div>
    </div>
  </div>
</template>
