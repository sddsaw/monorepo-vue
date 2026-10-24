<script setup lang="ts">
import { ref } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

const activeTab = ref<'problems' | 'logs' | 'output'>('problems')
const panelHeight = ref<number>(180)
const isResizing = ref(false)

function startResize(e: MouseEvent) {
  isResizing.value = true
  const startY = e.clientY
  const startHeight = panelHeight.value

  function onMouseMove(moveEvent: MouseEvent) {
    const delta = startY - moveEvent.clientY
    panelHeight.value = Math.max(100, Math.min(450, startHeight + delta))
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
  <section
    :style="{ height: `${panelHeight}px` }"
    class="flex flex-col bg-[#1e1e1e] border-t border-[#2d2d2d] select-none relative shrink-0 text-xs"
  >
    <!-- 上边缘拖拽调节高度手柄 -->
    <div
      @mousedown="startResize"
      :class="[isResizing ? 'bg-blue-500' : 'hover:bg-blue-500/50']"
      class="absolute top-0 left-0 w-full h-1 cursor-row-resize transition-colors z-10"
      title="拖拽调节面板高度"
    />

    <!-- 顶部选项卡栏 -->
    <div class="h-28px flex items-center justify-between px-3 border-b border-[#2d2d2d] bg-[#252526] text-gray-400">
      <div class="flex items-center gap-4">
        <button
          type="button"
          @click="activeTab = 'problems'"
          :class="[activeTab === 'problems' ? 'text-white border-b-2 border-blue-400 font-semibold' : 'text-gray-400 hover:text-white']"
          class="h-28px flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>问题 (Problems)</span>
          <span
            :class="[tpStore.validationResult.errors.length > 0 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300']"
            class="px-1.5 py-0.2 rounded-full text-10px font-mono"
          >
            {{ tpStore.validationResult.errors.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'logs'"
          :class="[activeTab === 'logs' ? 'text-white border-b-2 border-blue-400 font-semibold' : 'text-gray-400 hover:text-white']"
          class="h-28px flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>本地日志 (Logs)</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'output'"
          :class="[activeTab === 'output' ? 'text-white border-b-2 border-blue-400 font-semibold' : 'text-gray-400 hover:text-white']"
          class="h-28px flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>输出 (Output)</span>
        </button>
      </div>

      <!-- 右侧关闭按钮 -->
      <button
        type="button"
        @click="layoutStore.setBottomPanelVisible(false)"
        class="text-gray-400 hover:text-white cursor-pointer"
        title="关闭面板 (Ctrl+J)"
      >
        ✕
      </button>
    </div>

    <!-- 面板主体内容 -->
    <div class="flex-1 overflow-auto p-3 font-mono text-xs select-text">
      <!-- 1. 问题列表 -->
      <div v-if="activeTab === 'problems'">
        <div v-if="tpStore.validationResult.errors.length === 0" class="text-gray-500 py-4 text-center">
          ✓ 当前测试程序未检测到 DRC 规则或上下限错误
        </div>
        <ul v-else class="space-y-1.5 text-red-400">
          <li
            v-for="(err, idx) in tpStore.validationResult.errors"
            :key="idx"
            class="flex items-start gap-2 p-1.5 rounded hover:bg-red-950/30 cursor-pointer"
          >
            <span class="text-red-500">✕</span>
            <span>{{ err }}</span>
          </li>
        </ul>
      </div>

      <!-- 2. 日志 -->
      <div v-else-if="activeTab === 'logs'" class="text-gray-400 space-y-1">
        <div class="text-gray-500">[INFO] ATE Studio 日志系统就绪，已关联本地 rolling app.log</div>
        <div v-if="tpStore.fileName" class="text-blue-400">[INFO] 已加载测试程序: {{ tpStore.filePath }}</div>
        <div v-if="tpStore.isDirty" class="text-amber-400">[WARN] 检测到未保存的脏数据修改</div>
      </div>

      <!-- 3. 输出 -->
      <div v-else-if="activeTab === 'output'" class="text-gray-400">
        <div>ATE Studio 核心解析引擎版本: 1.0.0</div>
        <div>当前匹配适配器: {{ tpStore.activeAdapter?.name || '无' }}</div>
      </div>
    </div>
  </section>
</template>
