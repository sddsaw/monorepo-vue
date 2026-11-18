<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { useEventListener } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import AppUpdaterModal from '@/components/AppUpdaterModal.vue'
import { isMacOS, isTauri } from '@/plugins/tauri'
import {
  closeCurrentWindow,
  isCurrentWindowMaximized,
  minimizeCurrentWindow,
  openLogDir,
  toggleCurrentWindowMaximize,
} from '@/services/ipc'

defineOptions({
  name: 'DesktopTools',
})

const updaterModalRef = ref<InstanceType<typeof AppUpdaterModal> | null>(null)
const isMaximized = ref(false)

const isMac = computed(() => isMacOS())

const showWindowControls = computed(() => {
  return isTauri() && !isMac.value
})

async function checkMaximized() {
  if (!isTauri())
    return
  try {
    isMaximized.value = await isCurrentWindowMaximized()
  }
  catch {}
}

// 监听窗口尺寸变化（如 Windows Aero Snap 贴边最大化或双击标题栏），实时同步最大化图标状态
useEventListener(window, 'resize', checkMaximized)

async function handleMinimize() {
  if (!isTauri())
    return
  await minimizeCurrentWindow()
}

async function handleToggleMaximize() {
  if (!isTauri())
    return
  isMaximized.value = await toggleCurrentWindowMaximize()
}

async function handleClose() {
  if (!isTauri()) {
    window.close()
    return
  }
  await closeCurrentWindow()
}

onMounted(() => {
  checkMaximized()
})
</script>

<template>
  <div class="flex-y-center gap-4px">
    <!-- 桌面检查更新 -->
    <ButtonIcon
      tooltip-content="检查客户端版本更新"
      @click="updaterModalRef?.checkUpdate()"
    >
      <SvgIcon icon="carbon:upgrade" class="text-[#646cff] text-ui-18" />
    </ButtonIcon>

    <!-- 在文件管理器中打开本地滚动日志 -->
    <ButtonIcon
      tooltip-content="在系统文件管理器中查看日志"
      @click="openLogDir"
    >
      <SvgIcon icon="carbon:terminal" class="text-amber-500 text-ui-18" />
    </ButtonIcon>

    <!-- Windows / Linux 原生无边框自绘窗口控制按钮 -->
    <div v-if="showWindowControls" class="ml-2 flex-y-center border-l border-black/[0.08] pl-2 dark:border-white/[0.08]">
      <button
        type="button"
        title="最小化"
        class="h-7 w-7 flex items-center justify-center rounded text-slate-500 transition-colors active:scale-95 hover:bg-black/5 dark:text-zinc-400 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
        @click.stop="handleMinimize"
      >
        <SvgIcon icon="carbon:subtract" class="text-xs" />
      </button>
      <button
        type="button"
        :title="isMaximized ? '还原' : '最大化'"
        class="h-7 w-7 flex items-center justify-center rounded text-slate-500 transition-colors active:scale-95 hover:bg-black/5 dark:text-zinc-400 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
        @click.stop="handleToggleMaximize"
      >
        <SvgIcon :icon="isMaximized ? 'carbon:center-to-fit' : 'carbon:maximize'" class="text-xs" />
      </button>
      <button
        type="button"
        title="关闭"
        class="h-7 w-7 flex items-center justify-center rounded text-slate-500 transition-colors active:scale-95 hover:bg-red-500 dark:text-zinc-400 hover:text-white dark:hover:bg-red-500 dark:hover:text-white"
        @click.stop="handleClose"
      >
        <SvgIcon icon="carbon:close" class="text-sm" />
      </button>
    </div>

    <!-- 自动更新弹窗 -->
    <AppUpdaterModal ref="updaterModalRef" />
  </div>
</template>

<style scoped></style>
