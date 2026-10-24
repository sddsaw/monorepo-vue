<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ref } from 'vue'
import { isTauri } from '@/plugins/tauri'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

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
    class="h-35px flex items-center justify-between px-3 text-xs bg-[#2d2d2d] border-b border-[#1e1e1e] select-none text-gray-300"
  >
    <!-- 左侧：macOS 避让红绿灯 / Windows 菜单栏 -->
    <div class="flex items-center gap-3" :class="[isMac ? 'pl-16' : '']">
      <div class="flex items-center gap-1.5 font-bold text-white tracking-wider">
        <SvgIcon icon="ri:cpu-line" class="text-blue-400 text-15px" />
        <span class="text-11px hidden sm:inline">ATE Studio</span>
      </div>

      <!-- 顶部菜单项 -->
      <nav class="flex items-center gap-1 text-gray-300">
        <button
          type="button"
          @click="tpStore.chooseAndOpenFile"
          class="px-2 py-1 rounded hover:bg-[#3e3e42] transition-colors cursor-pointer text-11px"
        >
          文件(F)
        </button>
        <button
          type="button"
          @click="tpStore.saveFile"
          class="px-2 py-1 rounded hover:bg-[#3e3e42] transition-colors cursor-pointer text-11px"
        >
          保存(S)
        </button>
        <button
          type="button"
          @click="tpStore.runValidation"
          class="px-2 py-1 rounded hover:bg-[#3e3e42] transition-colors cursor-pointer text-11px"
        >
          校验(V)
        </button>
      </nav>
    </div>

    <!-- 中间：类 VS Code 快速文件检索框 (Ctrl + P) -->
    <div data-tauri-drag-region class="flex-1 flex justify-center max-w-md px-4">
      <div class="w-full flex items-center bg-[#1e1e1e] border border-[#3e3e42] hover:border-blue-500 rounded px-2.5 py-0.5 text-xs text-gray-300 transition-colors shadow-inner">
        <SvgIcon icon="ri:search-line" class="text-gray-500 text-12px mr-1.5 shrink-0" />
        <input
          v-model="searchKeyword"
          type="text"
          :placeholder="tpStore.fileName ? `${tpStore.fileName} (按 Ctrl+P 查找测试项)` : '打开 ATE 测试程序文件 (Ctrl+O)'"
          class="w-full bg-transparent border-none outline-none text-11px text-white placeholder-gray-500"
          @click.stop
        />
        <span class="text-9px bg-[#2d2d2d] px-1 py-0.5 rounded text-gray-400 border border-[#444] shrink-0 font-mono">
          Ctrl+P
        </span>
      </div>
    </div>

    <!-- 右侧：窗格显隐控制 / Windows 窗口操作 -->
    <div class="flex items-center gap-2">
      <!-- 切换主侧边栏 -->
      <button
        type="button"
        @click="layoutStore.toggleSidebar"
        :class="[layoutStore.sidebarVisible ? 'text-blue-400 bg-[#3e3e42]' : 'text-gray-400 hover:text-white']"
        class="p-1 rounded hover:bg-[#3e3e42] transition-colors cursor-pointer"
        title="切换主侧边栏 (Ctrl+B)"
      >
        <SvgIcon icon="ri:layout-left-line" class="text-13px" />
      </button>

      <!-- 切换底部面板 -->
      <button
        type="button"
        @click="layoutStore.toggleBottomPanel"
        :class="[layoutStore.bottomPanelVisible ? 'text-blue-400 bg-[#3e3e42]' : 'text-gray-400 hover:text-white']"
        class="p-1 rounded hover:bg-[#3e3e42] transition-colors cursor-pointer"
        title="切换底部面板 (Ctrl+J)"
      >
        <SvgIcon icon="ri:layout-bottom-line" class="text-13px" />
      </button>

      <!-- Windows 窗口最小化/最大化/关闭按钮 (非 macOS 模式呈现) -->
      <div v-if="!isMac" class="flex items-center ml-2 border-l border-[#3e3e42] pl-2">
        <button
          type="button"
          @click="handleMinimize"
          class="p-1 text-gray-400 hover:text-white hover:bg-[#3e3e42] rounded transition-colors"
        >
          <SvgIcon icon="ri:subtract-line" class="text-12px" />
        </button>
        <button
          type="button"
          @click="handleToggleMaximize"
          class="p-1 text-gray-400 hover:text-white hover:bg-[#3e3e42] rounded transition-colors"
        >
          <SvgIcon icon="ri:checkbox-multiple-blank-line" class="text-12px" />
        </button>
        <button
          type="button"
          @click="handleClose"
          class="p-1 text-gray-400 hover:text-white hover:bg-red-600 rounded transition-colors"
        >
          <SvgIcon icon="ri:close-line" class="text-13px" />
        </button>
      </div>
    </div>
  </header>
</template>
