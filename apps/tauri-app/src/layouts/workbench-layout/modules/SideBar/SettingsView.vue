<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useWorkbenchThemeStore } from '@/store/modules/workbenchTheme'
import { PRESET_WORKBENCH_THEMES } from '@/theme/workbenchTheme'

const themeStore = useWorkbenchThemeStore()
const message = useMessage()

const showImportModal = ref(false)
const importJsonText = ref('')

const presets = Object.values(PRESET_WORKBENCH_THEMES)

function handleSelectTheme(themeId: string) {
  themeStore.setTheme(themeId)
  message.success(`已切换至主题: ${PRESET_WORKBENCH_THEMES[themeId]?.name || themeId}`)
}

function handleImportJson() {
  if (!importJsonText.value.trim()) {
    message.warning('请输入 VS Code 主题 JSON 内容')
    return
  }

  try {
    themeStore.importVsCodeTheme(importJsonText.value)
    message.success('成功导入并激活自定义 VS Code 主题！')
    showImportModal.value = false
    importJsonText.value = ''
  }
  catch (e) {
    message.error(`主题 JSON 解析失败: ${String(e)}`)
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-3 overflow-y-auto font-sans text-xs select-none">
    <div class="flex items-center justify-between pb-2 mb-3 border-b border-[#2d2d2d]">
      <span class="font-bold text-[#e1e1e1] text-sm">主题与外观设置</span>
      <button
        type="button"
        @click="showImportModal = true"
        class="px-2 py-1 bg-[#007acc] hover:bg-[#1a8ad6] text-white rounded text-11px transition-colors cursor-pointer"
      >
        导入 VS Code 主题
      </button>
    </div>

    <!-- 预设主题列表 -->
    <div class="text-gray-400 font-semibold mb-2 uppercase text-10px tracking-wider">
      官方预设主题
    </div>

    <div class="flex flex-col gap-2 mb-6">
      <div
        v-for="p in presets"
        :key="p.id"
        @click="handleSelectTheme(p.id)"
        :class="[
          themeStore.currentThemeId === p.id
            ? 'border-[#007acc] bg-[#2d2d2d]/60 ring-1 ring-[#007acc]'
            : 'border-[#333333] hover:border-gray-500 bg-[#1e1e1e]/40',
        ]"
        class="p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col gap-2"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-[#cccccc]">{{ p.name }}</span>
          <span
            v-if="themeStore.currentThemeId === p.id"
            class="text-10px bg-[#007acc] text-white px-1.5 py-0.5 rounded"
          >
            当前激活
          </span>
        </div>

        <!-- 调色盘预览圆点 -->
        <div class="flex items-center gap-1.5 pt-1">
          <span
            class="size-3.5 rounded-full border border-black/30"
            :style="{ backgroundColor: p.editorBg }"
            title="主编辑区背景"
          />
          <span
            class="size-3.5 rounded-full border border-black/30"
            :style="{ backgroundColor: p.sidebarBg }"
            title="侧边栏背景"
          />
          <span
            class="size-3.5 rounded-full border border-black/30"
            :style="{ backgroundColor: p.activityBarBg }"
            title="活动栏背景"
          />
          <span
            class="size-3.5 rounded-full border border-black/30"
            :style="{ backgroundColor: p.statusBarBg }"
            title="状态栏背景"
          />
          <span
            class="size-3.5 rounded-full border border-black/30"
            :style="{ backgroundColor: p.accentColor }"
            title="主强调色"
          />
        </div>
      </div>
    </div>

    <!-- 当前颜色参数一览 -->
    <div class="text-gray-400 font-semibold mb-2 uppercase text-10px tracking-wider">
      当前生效色值 Token
    </div>

    <div class="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-2.5 flex flex-col gap-1.5 font-mono text-11px text-gray-400">
      <div class="flex justify-between items-center">
        <span>Accent:</span>
        <span class="text-[#007acc] font-bold">{{ themeStore.currentTheme.accentColor }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span>Editor Bg:</span>
        <span>{{ themeStore.currentTheme.editorBg }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span>SideBar Bg:</span>
        <span>{{ themeStore.currentTheme.sidebarBg }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span>TitleBar Bg:</span>
        <span>{{ themeStore.currentTheme.titleBarBg }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span>StatusBar Bg:</span>
        <span>{{ themeStore.currentTheme.statusBarBg }}</span>
      </div>
    </div>

    <!-- 导入弹窗 Modal -->
    <NModal
      v-model:show="showImportModal"
      preset="card"
      title="导入外部 VS Code 官方主题 JSON"
      class="max-w-560px"
    >
      <div class="flex flex-col gap-3 text-xs">
        <p class="text-gray-300">
          请粘贴 VS Code 主题扩展中的 <code>colors</code> 配置 JSON。工作台将自动映射 6 大核心窗格及 Dockview 分屏底色。
        </p>

        <NInput
          v-model:value="importJsonText"
          type="textarea"
          rows="10"
          placeholder="{ &quot;name&quot;: &quot;My Custom Theme&quot;, &quot;colors&quot;: { &quot;editor.background&quot;: &quot;#1e1e1e&quot;, ... } }"
          class="font-mono text-xs"
        />

        <div class="flex justify-end gap-2 pt-2">
          <NButton @click="showImportModal = false" size="small">
            取消
          </NButton>
          <NButton type="primary" @click="handleImportJson" size="small">
            解析并应用
          </NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>
