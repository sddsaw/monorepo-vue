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
  <div class="h-full flex flex-col select-none overflow-y-auto p-3 text-xs font-sans">
    <div class="mb-3 flex items-center justify-between border-b border-[#2d2d2d] pb-2">
      <span class="text-sm text-[#e1e1e1] font-bold">主题与外观设置</span>
      <button
        type="button"
        class="cursor-pointer rounded bg-[#007acc] px-2 py-1 text-11px text-white transition-colors hover:bg-[#1a8ad6]"
        @click="showImportModal = true"
      >
        导入 VS Code 主题
      </button>
    </div>

    <!-- 预设主题列表 -->
    <div class="mb-2 text-10px text-gray-400 font-semibold tracking-wider uppercase">
      官方预设主题
    </div>

    <div class="mb-6 flex flex-col gap-2">
      <div
        v-for="p in presets"
        :key="p.id"
        :class="[
          themeStore.currentThemeId === p.id
            ? 'border-[#007acc] bg-[#2d2d2d]/60 ring-1 ring-[#007acc]'
            : 'border-[#333333] hover:border-gray-500 bg-[#1e1e1e]/40',
        ]"
        class="flex flex-col cursor-pointer gap-2 border rounded-lg p-2.5 transition-all"
        @click="handleSelectTheme(p.id)"
      >
        <div class="flex items-center justify-between">
          <span class="text-[#cccccc] font-medium">{{ p.name }}</span>
          <span
            v-if="themeStore.currentThemeId === p.id"
            class="rounded bg-[#007acc] px-1.5 py-0.5 text-10px text-white"
          >
            当前激活
          </span>
        </div>

        <!-- 调色盘预览圆点 -->
        <div class="flex items-center gap-1.5 pt-1">
          <span
            class="size-3.5 border border-black/30 rounded-full"
            :style="{ backgroundColor: p.editorBg }"
            title="主编辑区背景"
          />
          <span
            class="size-3.5 border border-black/30 rounded-full"
            :style="{ backgroundColor: p.sidebarBg }"
            title="侧边栏背景"
          />
          <span
            class="size-3.5 border border-black/30 rounded-full"
            :style="{ backgroundColor: p.activityBarBg }"
            title="活动栏背景"
          />
          <span
            class="size-3.5 border border-black/30 rounded-full"
            :style="{ backgroundColor: p.statusBarBg }"
            title="状态栏背景"
          />
          <span
            class="size-3.5 border border-black/30 rounded-full"
            :style="{ backgroundColor: p.accentColor }"
            title="主强调色"
          />
        </div>
      </div>
    </div>

    <!-- 当前颜色参数一览 -->
    <div class="mb-2 text-10px text-gray-400 font-semibold tracking-wider uppercase">
      当前生效色值 Token
    </div>

    <div class="flex flex-col gap-1.5 border border-[#2d2d2d] rounded-lg bg-[#1e1e1e] p-2.5 text-11px text-gray-400 font-mono">
      <div class="flex items-center justify-between">
        <span>Accent:</span>
        <span class="text-[#007acc] font-bold">{{ themeStore.currentTheme.accentColor }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span>Editor Bg:</span>
        <span>{{ themeStore.currentTheme.editorBg }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span>SideBar Bg:</span>
        <span>{{ themeStore.currentTheme.sidebarBg }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span>TitleBar Bg:</span>
        <span>{{ themeStore.currentTheme.titleBarBg }}</span>
      </div>
      <div class="flex items-center justify-between">
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
          class="text-xs font-mono"
        />

        <div class="flex justify-end gap-2 pt-2">
          <NButton size="small" @click="showImportModal = false">
            取消
          </NButton>
          <NButton type="primary" size="small" @click="handleImportJson">
            解析并应用
          </NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>
