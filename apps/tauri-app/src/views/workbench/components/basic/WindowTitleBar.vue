<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ProximaLogo from '@/components/common/ProximaLogo.vue'
import { isTauri } from '@/plugins/tauri'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

const router = useRouter()
const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

const isMac = navigator.userAgent.toLowerCase().includes('mac')
const searchKeyword = ref('')

async function handleMinimize() {
  if (isTauri()) {
    await getCurrentWindow().minimize()
  }
}

async function handleToggleMaximize() {
  if (isTauri()) {
    await getCurrentWindow().toggleMaximize()
  }
}

async function handleClose() {
  if (isTauri()) {
    await getCurrentWindow().close()
  }
}
</script>

<template>
  <header
    data-tauri-drag-region
    :style="{
      backgroundColor: 'var(--wb-titlebar-bg, #2d2d2d)',
      borderColor: 'var(--wb-border-color, #1e1e1e)',
      color: 'var(--wb-text-color, #cccccc)',
    }"
    class="h-35px flex select-none items-center justify-between border-b px-3 text-xs"
  >
    <!-- 左侧：macOS 避让红绿灯 / Windows 菜单栏 -->
    <div class="flex items-center gap-3" :class="[isMac ? 'pl-16' : '']">
      <div
        class="flex cursor-pointer items-center gap-1.5 text-white font-bold tracking-wider transition-opacity hover:opacity-80"
        title="返回 Proxima 首页"
        @click="router.push('/home')"
      >
        <ProximaLogo :size="18" :show-shadow="false" />
        <span class="hidden text-11px sm:inline">Proxima</span>
      </div>

      <!-- 顶部菜单项 -->
      <nav class="flex items-center gap-1 text-gray-300">
        <button
          type="button"
          class="cursor-pointer rounded px-2 py-1 text-11px text-blue-300 transition-colors hover:bg-[#3e3e42]"
          title="返回 Proxima 欢迎首页"
          @click="router.push('/home')"
        >
          首页(H)
        </button>
        <button
          type="button"
          class="cursor-pointer rounded px-2 py-1 text-11px transition-colors hover:bg-[#3e3e42]"
          @click="tpStore.chooseAndOpenFile"
        >
          文件(F)
        </button>
        <button
          type="button"
          class="cursor-pointer rounded px-2 py-1 text-11px transition-colors hover:bg-[#3e3e42]"
          @click="tpStore.saveFile"
        >
          保存(S)
        </button>
        <button
          type="button"
          class="cursor-pointer rounded px-2 py-1 text-11px transition-colors hover:bg-[#3e3e42]"
          @click="tpStore.runValidation"
        >
          校验(V)
        </button>
      </nav>
    </div>

    <!-- 中间：类 VS Code 快速文件检索框 (Ctrl + P) -->
    <div data-tauri-drag-region class="max-w-md flex flex-1 justify-center px-4">
      <div class="w-full flex items-center border border-[#3e3e42] rounded bg-[#1e1e1e] px-2.5 py-0.5 text-xs text-gray-300 shadow-inner transition-colors hover:border-blue-500">
        <SvgIcon icon="ri:search-line" class="mr-1.5 shrink-0 text-12px text-gray-500" />
        <input
          v-model="searchKeyword"
          type="text"
          :placeholder="tpStore.fileName ? `${tpStore.fileName} (按 Ctrl+P 查找测试项)` : '打开 ATE 测试程序文件 (Ctrl+O)'"
          class="w-full border-none bg-transparent text-11px text-white outline-none placeholder-gray-500"
          @click.stop
        >
        <span class="shrink-0 border border-[#444] rounded bg-[#2d2d2d] px-1 py-0.5 text-9px text-gray-400 font-mono">
          Ctrl+P
        </span>
      </div>
    </div>

    <!-- 右侧：窗格显隐控制 / Windows 窗口操作 -->
    <div class="flex items-center gap-2">
      <!-- 切换主侧边栏 -->
      <button
        type="button"
        :class="[layoutStore.sidebarVisible ? 'text-blue-400 bg-[#3e3e42]' : 'text-gray-400 hover:text-white']"
        class="cursor-pointer rounded p-1 transition-colors hover:bg-[#3e3e42]"
        title="切换主侧边栏 (Ctrl+B)"
        @click="layoutStore.toggleSidebar"
      >
        <SvgIcon icon="ri:layout-left-line" class="text-13px" />
      </button>

      <!-- 切换底部面板 -->
      <button
        type="button"
        :class="[layoutStore.bottomPanelVisible ? 'text-blue-400 bg-[#3e3e42]' : 'text-gray-400 hover:text-white']"
        class="cursor-pointer rounded p-1 transition-colors hover:bg-[#3e3e42]"
        title="切换底部面板 (Ctrl+J)"
        @click="layoutStore.toggleBottomPanel"
      >
        <SvgIcon icon="ri:layout-bottom-line" class="text-13px" />
      </button>

      <!-- 切换辅助侧边栏 (Copilot 聊天) -->
      <button
        type="button"
        :class="[layoutStore.secondarySidebarVisible ? 'text-blue-400 bg-[#3e3e42]' : 'text-gray-400 hover:text-white']"
        class="cursor-pointer rounded p-1 transition-colors hover:bg-[#3e3e42]"
        title="切换辅助侧边栏 (Copilot)"
        @click="layoutStore.toggleSecondarySidebar"
      >
        <SvgIcon icon="ri:layout-right-line" class="text-13px" />
      </button>

      <!-- Windows 窗口最小化/最大化/关闭按钮 (非 macOS 模式呈现) -->
      <div v-if="!isMac" class="ml-2 flex items-center border-l border-[#3e3e42] pl-2">
        <button
          type="button"
          class="rounded p-1 text-gray-400 transition-colors hover:bg-[#3e3e42] hover:text-white"
          @click="handleMinimize"
        >
          <SvgIcon icon="ri:subtract-line" class="text-12px" />
        </button>
        <button
          type="button"
          class="rounded p-1 text-gray-400 transition-colors hover:bg-[#3e3e42] hover:text-white"
          @click="handleToggleMaximize"
        >
          <SvgIcon icon="ri:checkbox-multiple-blank-line" class="text-12px" />
        </button>
        <button
          type="button"
          class="rounded p-1 text-gray-400 transition-colors hover:bg-red-600 hover:text-white"
          @click="handleClose"
        >
          <SvgIcon icon="ri:close-line" class="text-13px" />
        </button>
      </div>
    </div>
  </header>
</template>
