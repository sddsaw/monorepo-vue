<script setup lang="ts">
import { ref } from 'vue'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

defineOptions({
  name: 'SecondarySideBar',
})

setupIconifyOffline()

const layoutStore = useWorkbenchLayoutStore()

const sidebarWidth = ref<number>(340)
const isResizing = ref(false)
const activeTab = ref<'chat' | 'codex'>('chat')
const inputPrompt = ref('')

function startResize(e: MouseEvent) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function onMouseMove(moveEvent: MouseEvent) {
    // 位于右侧，向左拖拽时光标 clientX 变小，宽度应增加
    const delta = startX - moveEvent.clientX
    sidebarWidth.value = Math.max(260, Math.min(600, startWidth + delta))
  }

  function onMouseUp() {
    isResizing.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <aside
    :style="{
      width: `${sidebarWidth}px`,
      backgroundColor: 'var(--wb-sidebar-bg, #181818)',
      borderColor: 'var(--wb-border-color, #2b2b2b)',
    }"
    class="relative h-full flex flex-col shrink-0 select-none border-l text-[#cccccc]"
  >
    <!-- 左边缘拖拽手柄 -->
    <div
      :class="[isResizing ? 'bg-blue-500' : 'hover:bg-blue-500/50']"
      class="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors"
      title="拖拽调节右侧边栏宽度"
      @mousedown="startResize"
    />

    <!-- 1. 顶部 Tab 与控制工具栏 -->
    <div class="h-35px flex shrink-0 items-center justify-between border-b border-[#2b2b2b] px-3">
      <!-- 左侧：Tabs (聊天 / Codex / ...) -->
      <div class="flex items-center gap-1.5 text-xs">
        <div
          class="cursor-pointer rounded px-2.5 py-1 text-white font-medium transition-colors"
          :class="[activeTab === 'chat' ? 'bg-[#2b2b2b]' : 'text-[#969696] hover:text-white']"
          @click="activeTab = 'chat'"
        >
          聊天
        </div>
        <div
          class="cursor-pointer rounded px-2 py-1 transition-colors"
          :class="[activeTab === 'codex' ? 'bg-[#2b2b2b] text-white' : 'text-[#969696] hover:text-white']"
          @click="activeTab = 'codex'"
        >
          Codex
        </div>
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 text-[#969696] hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:ellipsis" class="text-14px" />
            </button>
          </template>
          <span>更多视图</span>
        </NTooltip>
      </div>

      <!-- 右侧：控制按钮组 -->
      <div class="flex items-center gap-0.5 text-[#969696]">
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:settings-gear" class="text-14px" />
            </button>
          </template>
          <span>聊天设置</span>
        </NTooltip>
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:ellipsis" class="text-14px" />
            </button>
          </template>
          <span>更多操作</span>
        </NTooltip>
        <span class="mx-1 h-3 w-1px bg-[#3e3e42]" />
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:screen-full" class="text-13px" />
            </button>
          </template>
          <span>全屏 / 展开</span>
        </NTooltip>
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button
              type="button"
              class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white"
              @click="layoutStore.toggleSecondarySidebar"
            >
              <SvgIcon icon="codicon:close" class="text-14px" />
            </button>
          </template>
          <span>关闭辅助侧边栏</span>
        </NTooltip>
      </div>
    </div>

    <!-- 2. 二级标题行：会话与快捷工具 -->
    <div class="h-32px flex shrink-0 items-center justify-between border-b border-[#2b2b2b] px-3 text-xs text-gray-300">
      <span class="text-[#cccccc] font-medium">会话</span>
      <div class="flex items-center gap-1 text-[#969696]">
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:refresh" class="text-13px" />
            </button>
          </template>
          <span>刷新会话</span>
        </NTooltip>
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:search" class="text-13px" />
            </button>
          </template>
          <span>查找会话</span>
        </NTooltip>
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:filter" class="text-13px" />
            </button>
          </template>
          <span>筛选会话</span>
        </NTooltip>
        <NTooltip placement="bottom" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:layout-sidebar-right" class="text-13px" />
            </button>
          </template>
          <span>在新编辑器中打开</span>
        </NTooltip>
      </div>
    </div>

    <!-- 3. 中间消息历史滚动区域 (当前保持为空状态布局) -->
    <div class="flex-1 overflow-y-auto p-3" />

    <!-- 4. 底部浮动对话输入卡片 (Copilot Chat Card) -->
    <div class="mx-3 mb-2 shrink-0 overflow-hidden border border-[#333333] rounded-10px bg-[#212121] shadow-lg">
      <!-- 卡片顶部提示文字 -->
      <div class="border-b border-[#2d2d2d] px-3 py-2 text-11px text-[#969696] leading-relaxed">
        提示: 还有其他任务要处理?启动新会话以同时运行多个智能体。
      </div>

      <!-- 卡片主体：上下文 Pill + 输入框 + 控制条 -->
      <div class="p-2.5">
        <!-- 上下文附带文件 Pill -->
        <div class="mb-2 flex flex-wrap items-center gap-1.5">
          <div class="inline-flex cursor-pointer items-center gap-1.5 border border-[#444] rounded-full border-dashed bg-[#2a2a2a] px-2.5 py-0.5 text-11px text-[#cccccc] transition-colors hover:border-gray-400">
            <SvgIcon icon="codicon:add" class="text-11px text-gray-400" />
            <span class="inline-flex items-center justify-center rounded bg-[#00b4d8]/10 px-1 text-9px text-[#00b4d8] font-bold font-mono">C#</span>
            <span class="text-gray-300 italic">StorageServiceTests.cs</span>
          </div>
        </div>

        <!-- 文本输入框 -->
        <textarea
          v-model="inputPrompt"
          rows="2"
          placeholder="与 Copilot 聊天"
          class="w-full resize-none border-none bg-transparent text-12px text-white outline-none placeholder-[#6e6e6e]"
        />

        <!-- 卡片底部控制条 -->
        <div class="mt-2 flex items-center justify-between pt-1">
          <!-- 左侧：添加上下文 + Agent 模式 + 模型选择 -->
          <div class="flex items-center gap-1.5 text-xs text-[#cccccc]">
            <NTooltip placement="top" trigger="hover">
              <template #trigger>
                <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                  <SvgIcon icon="codicon:add" class="text-13px" />
                </button>
              </template>
              <span>附加文件或上下文</span>
            </NTooltip>

            <!-- Agent 模式 Pill -->
            <button
              type="button"
              class="flex cursor-pointer items-center gap-1 rounded-md border-none bg-[#2b2b2b] px-2 py-0.5 text-11px text-gray-300 transition-colors hover:bg-[#383838]"
            >
              <SvgIcon icon="codicon:code" class="text-12px text-gray-400" />
              <span>Agent</span>
            </button>

            <!-- 模型选择 Pill -->
            <button
              type="button"
              class="flex cursor-pointer items-center gap-1 rounded-md border-none bg-[#2b2b2b] px-2 py-0.5 text-11px text-gray-300 transition-colors hover:bg-[#383838]"
            >
              <SvgIcon icon="codicon:copilot" class="text-12px text-gray-400" />
              <span>HydraFusion</span>
            </button>
          </div>

          <!-- 右侧：语音输入与发送按钮 -->
          <div class="flex items-center gap-1 text-[#969696]">
            <NTooltip placement="top" trigger="hover">
              <template #trigger>
                <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 hover:bg-white/10 hover:text-white">
                  <SvgIcon icon="codicon:mic" class="text-13px" />
                </button>
              </template>
              <span>语音输入</span>
            </NTooltip>

            <button
              type="button"
              class="size-6 flex cursor-pointer items-center justify-center rounded-md border-none bg-[#2b2b2b] text-gray-400 transition-colors hover:bg-white/20 hover:text-white"
            >
              <SvgIcon icon="codicon:arrow-up" class="text-13px font-bold" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. 最底部状态栏 (Copilot 品牌与状态图标) -->
    <div class="h-28px flex shrink-0 items-center justify-between border-t border-[#2b2b2b] px-3 text-11px text-[#969696]">
      <div class="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-white">
        <SvgIcon icon="codicon:copilot" class="text-13px text-gray-400" />
        <span class="font-medium">Copilot</span>
      </div>
      <div class="flex items-center gap-2">
        <NTooltip placement="top" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 text-gray-400 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:comment" class="text-12px" />
            </button>
          </template>
          <span>聊天会话</span>
        </NTooltip>
        <NTooltip placement="top" trigger="hover">
          <template #trigger>
            <button type="button" class="cursor-pointer rounded border-none bg-transparent p-1 text-gray-400 hover:bg-white/10 hover:text-white">
              <SvgIcon icon="codicon:radio-tower" class="text-12px" />
            </button>
          </template>
          <span>状态与连接</span>
        </NTooltip>
      </div>
    </div>
  </aside>
</template>
