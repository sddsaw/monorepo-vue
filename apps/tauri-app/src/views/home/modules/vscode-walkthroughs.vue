<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/store/modules/theme'

defineOptions({
  name: 'VscodeWalkthroughs',
})

const message = useMessage()
const router = useRouter()
const themeStore = useThemeStore()

const activeGuide = ref<string>('tauri')

function toggleGuide(id: string) {
  activeGuide.value = activeGuide.value === id ? '' : id
}

function handleGoDesktop() {
  router.push('/desktop')
}

function handleToggleTheme() {
  const next = themeStore.darkMode ? 'light' : 'dark'
  themeStore.setThemeScheme(next)
  message.success(`已切换为${next === 'dark' ? '深色' : '浅色'}主题`)
}
</script>

<template>
  <div class="vscode-walkthroughs flex flex-col">
    <div class="section-title mb-3 flex items-center justify-between text-16px text-[#e0e0e0] font-semibold">
      <div class="flex items-center gap-2">
        <span class="text-[#007acc]">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
        <span>快速演练</span>
      </div>
      <span class="text-12px text-[#858585]">
        更多体验指南
      </span>
    </div>

    <!-- Walkthrough Cards -->
    <div class="flex flex-col gap-2.5">
      <!-- 1. Tauri 桌面特性 -->
      <div
        class="guide-card border rounded transition-all duration-200"
        :class="[activeGuide === 'tauri' ? 'bg-[#252526] border-[#007acc]/60' : 'bg-[#1f1f1f] border-[#2d2d2d] hover:border-[#3e3e42]']"
      >
        <div
          class="card-header flex cursor-pointer select-none items-center justify-between p-3"
          @click="toggleGuide('tauri')"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-16px text-[#007acc]">🚀</span>
            <div>
              <div class="text-13px text-[#e0e0e0] font-medium">
                开始使用 Tauri 桌面端工程
              </div>
              <div class="text-11px text-[#888888]">
                体验 Rust 原生 IPC 通信、系统对话框与多窗口能力
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded bg-[#388a34]/15 px-2 py-0.5 text-11px text-[#388a34]">3/4 步完成</span>
            <span class="text-12px text-[#888888] transition-transform" :class="[activeGuide === 'tauri' ? 'rotate-180' : '']">▼</span>
          </div>
        </div>

        <div v-show="activeGuide === 'tauri'" class="card-body border-t border-[#2d2d2d]/60 px-3 pb-3 pt-1 text-12px text-[#cccccc]">
          <p class="mb-2 mt-2 text-[#9d9d9d] leading-relaxed">
            该工程基于 Tauri v2 构建，前端与 Rust 后端通过强类型 IPC 消息协议高效交互，带来秒级启动和极低内存占用。
          </p>
          <div class="mt-3 flex items-center gap-2">
            <button
              class="cursor-pointer border-0 rounded bg-[#007acc] px-3 py-1.5 text-12px text-white transition-colors hover:bg-[#1a8ad6]"
              @click="handleGoDesktop"
            >
              进入桌面原生工作台 →
            </button>
            <span class="text-11px text-[#757575]">支持文件系统、系统通知与自定义托盘</span>
          </div>
        </div>
      </div>

      <!-- 2. 自定义外观 -->
      <div
        class="guide-card border rounded transition-all duration-200"
        :class="[activeGuide === 'theme' ? 'bg-[#252526] border-[#007acc]/60' : 'bg-[#1f1f1f] border-[#2d2d2d] hover:border-[#3e3e42]']"
      >
        <div
          class="card-header flex cursor-pointer select-none items-center justify-between p-3"
          @click="toggleGuide('theme')"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-16px text-[#007acc]">🎨</span>
            <div>
              <div class="text-13px text-[#e0e0e0] font-medium">
                定制你的主题与视觉风格
              </div>
              <div class="text-11px text-[#888888]">
                当前主题: VS Code Dark Modern · 主题色: #007acc
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-12px text-[#888888] transition-transform" :class="[activeGuide === 'theme' ? 'rotate-180' : '']">▼</span>
          </div>
        </div>

        <div v-show="activeGuide === 'theme'" class="card-body border-t border-[#2d2d2d]/60 px-3 pb-3 pt-1 text-12px text-[#cccccc]">
          <p class="mb-2 mt-2 text-[#9d9d9d] leading-relaxed">
            随时切换亮色/暗色模式、调整主色调、侧边栏宽度与顶部导航风格。
          </p>
          <div class="mt-3 flex items-center gap-2">
            <button
              class="cursor-pointer border border-[#444] rounded bg-[#333333] px-3 py-1.5 text-12px text-[#cccccc] transition-colors hover:bg-[#3e3e42]"
              @click="handleToggleTheme"
            >
              切换 {{ themeStore.darkMode ? '浅色模式' : '深色模式' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 3. 核心快捷键 -->
      <div
        class="guide-card border rounded transition-all duration-200"
        :class="[activeGuide === 'shortcuts' ? 'bg-[#252526] border-[#007acc]/60' : 'bg-[#1f1f1f] border-[#2d2d2d] hover:border-[#3e3e42]']"
      >
        <div
          class="card-header flex cursor-pointer select-none items-center justify-between p-3"
          @click="toggleGuide('shortcuts')"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-16px text-[#007acc]">⌨️</span>
            <div>
              <div class="text-13px text-[#e0e0e0] font-medium">
                核心快捷键一览
              </div>
              <div class="text-11px text-[#888888]">
                全局命令面板、文件检索、分屏与终端
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-12px text-[#888888] transition-transform" :class="[activeGuide === 'shortcuts' ? 'rotate-180' : '']">▼</span>
          </div>
        </div>

        <div v-show="activeGuide === 'shortcuts'" class="card-body border-t border-[#2d2d2d]/60 px-3 pb-3 pt-1 text-12px text-[#cccccc]">
          <div class="grid grid-cols-2 mt-2 gap-2">
            <div class="flex items-center justify-between border border-[#333] rounded bg-[#1e1e1e] px-2.5 py-1.5">
              <span class="text-[#9d9d9d]">全局命令面板</span>
              <kbd class="shortcut-kbd">⌘⇧P</kbd>
            </div>
            <div class="flex items-center justify-between border border-[#333] rounded bg-[#1e1e1e] px-2.5 py-1.5">
              <span class="text-[#9d9d9d]">快速前往文件</span>
              <kbd class="shortcut-kbd">⌘P</kbd>
            </div>
            <div class="flex items-center justify-between border border-[#333] rounded bg-[#1e1e1e] px-2.5 py-1.5">
              <span class="text-[#9d9d9d]">折叠/展开侧栏</span>
              <kbd class="shortcut-kbd">⌘B</kbd>
            </div>
            <div class="flex items-center justify-between border border-[#333] rounded bg-[#1e1e1e] px-2.5 py-1.5">
              <span class="text-[#9d9d9d]">拆分当前编辑</span>
              <kbd class="shortcut-kbd">⌘\</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shortcut-kbd {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  color: #9d9d9d;
  background-color: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  padding: 1px 5px;
}
</style>
