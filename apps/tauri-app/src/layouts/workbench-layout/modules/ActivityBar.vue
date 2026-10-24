<script setup lang="ts">
import { type ActivityType, useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

const layoutStore = useWorkbenchLayoutStore()

const activities: { key: ActivityType, label: string, icon: string }[] = [
  { key: 'explorer', label: '资源管理器 (测试项树)', icon: 'ri:folder-line' },
  { key: 'search', label: '全局搜索 (Search)', icon: 'ri:search-line' },
]
</script>

<template>
  <aside class="w-48px h-full flex flex-col justify-between items-center py-2 bg-[#333333] border-r border-[#252526] select-none text-gray-400">
    <!-- 顶部主图标组 -->
    <div class="flex flex-col items-center gap-1 w-full">
      <button
        v-for="item in activities"
        :key="item.key"
        type="button"
        @click="layoutStore.setActiveActivity(item.key)"
        :class="[
          layoutStore.activeActivity === item.key && layoutStore.sidebarVisible
            ? 'text-white border-l-2 border-white bg-[#252526]'
            : 'text-gray-400 hover:text-white border-l-2 border-transparent',
        ]"
        class="w-full h-42px flex items-center justify-center transition-colors cursor-pointer relative"
        :title="item.label"
      >
        <SvgIcon :icon="item.icon" class="text-20px" />
      </button>
    </div>

    <!-- 底部辅助图标组 (设置等) -->
    <div class="flex flex-col items-center gap-1 w-full">
      <button
        type="button"
        @click="layoutStore.setActiveActivity('settings')"
        :class="[
          layoutStore.activeActivity === 'settings' && layoutStore.sidebarVisible
            ? 'text-white border-l-2 border-white bg-[#252526]'
            : 'text-gray-400 hover:text-white border-l-2 border-transparent',
        ]"
        class="w-full h-42px flex items-center justify-center transition-colors cursor-pointer"
        title="首选项与设置"
      >
        <SvgIcon icon="ri:settings-line" class="text-20px" />
      </button>
    </div>
  </aside>
</template>
