<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isTauri } from '@/plugins/tauri'
import { openFileDialog } from '@/services/ipc/dialog'

defineOptions({
  name: 'VscodeStart',
})

const message = useMessage()
const router = useRouter()

const isMac = computed(() => {
  if (typeof navigator === 'undefined')
    return false
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
})

const modKey = computed(() => (isMac.value ? '⌘' : 'Ctrl+'))

// Clone modal state
const showCloneModal = ref(false)
const repoUrl = ref('https://github.com/soybeanjs/soybean-admin.git')
const cloneLoading = ref(false)

// New file modal state
const showNewFileModal = ref(false)
const newFileName = ref('untitled.vue')

async function handleOpenFile() {
  if (isTauri()) {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: '选择要打开的文件',
      })
      if (selected) {
        message.success(`已选择文件: ${selected}`)
      }
    }
    catch (err: unknown) {
      message.error(`打开文件失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  else {
    // Web fallback
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement | null
      const file = target?.files?.[0]
      if (file) {
        message.success(`浏览器环境选择文件: ${file.name}`)
      }
    }
    input.click()
  }
}

async function handleOpenFolder() {
  if (isTauri()) {
    try {
      const selected = await openFileDialog({
        directory: true,
        multiple: false,
        title: '选择要打开的文件夹',
      })
      if (selected) {
        message.success(`已打开工作区文件夹: ${selected}`)
      }
    }
    catch (err: unknown) {
      message.error(`打开文件夹失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  else {
    message.info('当前为 Web 调试模式，Tauri 桌面端将调起原生系统文件夹选取器')
  }
}

function handleNewFile() {
  showNewFileModal.value = true
}

function confirmNewFile() {
  if (!newFileName.value.trim()) {
    message.warning('请输入有效文件名')
    return
  }
  message.success(`已创建新工作区文件: ${newFileName.value}`)
  showNewFileModal.value = false
  newFileName.value = 'untitled.vue'
}

function handleCloneRepo() {
  showCloneModal.value = true
}

let cloneTimer: ReturnType<typeof setTimeout> | null = null

function confirmClone() {
  if (!repoUrl.value.trim()) {
    message.warning('请输入 Git 仓库地址')
    return
  }
  cloneLoading.value = true
  if (cloneTimer) {
    clearTimeout(cloneTimer)
  }
  cloneTimer = setTimeout(() => {
    cloneTimer = null
    cloneLoading.value = false
    showCloneModal.value = false
    message.success(`成功拉取仓库: ${repoUrl.value}`)
  }, 900)
}

onBeforeUnmount(() => {
  if (cloneTimer) {
    clearTimeout(cloneTimer)
    cloneTimer = null
  }
})

function handleOpenWorkbench() {
  router.push('/desktop')
}

function handleRunCommand() {
  message.info(`按 ${modKey.value}Shift+P 或点击右上角搜索图标打开命令面板`)
}
</script>

<template>
  <div class="vscode-start flex flex-col">
    <div class="section-title mb-3 flex items-center gap-2 text-16px text-[#e0e0e0] font-semibold">
      <span class="text-[#007acc]">
        <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span>开始</span>
    </div>

    <div class="action-list flex flex-col gap-1.5">
      <!-- 1. 新建文件 -->
      <button
        class="action-item group flex cursor-pointer items-center justify-between border-0 rounded bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#2a2d2e]"
        @click="handleNewFile"
      >
        <div class="flex items-center gap-3">
          <span class="icon-box text-[#007acc] transition-colors group-hover:text-[#4daafc]">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </span>
          <span class="text-13px text-[#cccccc] font-normal transition-colors group-hover:text-[#ffffff]">
            新建文件...
          </span>
        </div>
        <kbd class="shortcut-kbd">{{ modKey }}N</kbd>
      </button>

      <!-- 2. 打开文件 -->
      <button
        class="action-item group flex cursor-pointer items-center justify-between border-0 rounded bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#2a2d2e]"
        @click="handleOpenFile"
      >
        <div class="flex items-center gap-3">
          <span class="icon-box text-[#007acc] transition-colors group-hover:text-[#4daafc]">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span>
          <span class="text-13px text-[#cccccc] font-normal transition-colors group-hover:text-[#ffffff]">
            打开文件...
          </span>
        </div>
        <kbd class="shortcut-kbd">{{ modKey }}O</kbd>
      </button>

      <!-- 3. 打开文件夹 -->
      <button
        class="action-item group flex cursor-pointer items-center justify-between border-0 rounded bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#2a2d2e]"
        @click="handleOpenFolder"
      >
        <div class="flex items-center gap-3">
          <span class="icon-box text-[#007acc] transition-colors group-hover:text-[#4daafc]">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span class="text-13px text-[#cccccc] font-normal transition-colors group-hover:text-[#ffffff]">
            打开文件夹...
          </span>
        </div>
        <kbd class="shortcut-kbd">{{ modKey }}K {{ modKey }}O</kbd>
      </button>

      <!-- 4. 克隆 Git 仓库 -->
      <button
        class="action-item group flex cursor-pointer items-center justify-between border-0 rounded bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#2a2d2e]"
        @click="handleCloneRepo"
      >
        <div class="flex items-center gap-3">
          <span class="icon-box text-[#007acc] transition-colors group-hover:text-[#4daafc]">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </span>
          <span class="text-13px text-[#cccccc] font-normal transition-colors group-hover:text-[#ffffff]">
            克隆 Git 仓库...
          </span>
        </div>
      </button>

      <!-- 5. 桌面原生工作台 -->
      <button
        class="action-item group flex cursor-pointer items-center justify-between border-0 rounded bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#2a2d2e]"
        @click="handleOpenWorkbench"
      >
        <div class="flex items-center gap-3">
          <span class="icon-box text-[#007acc] transition-colors group-hover:text-[#4daafc]">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </span>
          <span class="text-13px text-[#cccccc] font-normal transition-colors group-hover:text-[#ffffff]">
            打开桌面原生工作台
          </span>
        </div>
        <span class="border border-[#388a34]/30 rounded bg-[#388a34]/15 px-1.5 py-0.5 text-11px text-[#388a34]">Tauri IPC</span>
      </button>

      <!-- 6. 运行命令 -->
      <button
        class="action-item group flex cursor-pointer items-center justify-between border-0 rounded bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#2a2d2e]"
        @click="handleRunCommand"
      >
        <div class="flex items-center gap-3">
          <span class="icon-box text-[#007acc] transition-colors group-hover:text-[#4daafc]">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </span>
          <span class="text-13px text-[#cccccc] font-normal transition-colors group-hover:text-[#ffffff]">
            显示所有命令...
          </span>
        </div>
        <kbd class="shortcut-kbd">{{ modKey }}⇧P</kbd>
      </button>
    </div>

    <!-- Clone Modal -->
    <NModal
      v-model:show="showCloneModal"
      preset="dialog"
      title="克隆 Git 仓库"
      positive-text="克隆"
      negative-text="取消"
      :loading="cloneLoading"
      @positive-click="confirmClone"
    >
      <div class="py-2">
        <p class="mb-2 text-13px text-[#9d9d9d]">
          提供仓库 URL 或在 GitHub 上搜索
        </p>
        <NInput
          v-model:value="repoUrl"
          placeholder="https://github.com/organization/repository.git"
          clearable
        />
      </div>
    </NModal>

    <!-- New File Modal -->
    <NModal
      v-model:show="showNewFileModal"
      preset="dialog"
      title="新建文件"
      positive-text="创建"
      negative-text="取消"
      @positive-click="confirmNewFile"
    >
      <div class="py-2">
        <p class="mb-2 text-13px text-[#9d9d9d]">
          输入新文件名（支持 .vue, .ts, .js, .json, .md 等扩展名）
        </p>
        <NInput
          v-model:value="newFileName"
          placeholder="例如: index.vue 或 app.ts"
          clearable
        />
      </div>
    </NModal>
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
  padding: 2px 6px;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}
</style>
