<script setup lang="ts">
import { computed } from 'vue'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useAuthStore } from '@/store/modules/auth'
import { useTpStore } from '@/store/modules/tp'
import { type ActivityType, useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

// 确保在 HMR 或组件加载时，最新的 codicon 本地集合立即注册生效
setupIconifyOffline()

const layoutStore = useWorkbenchLayoutStore()
const tpStore = useTpStore()
const authStore = useAuthStore()

interface ActivityItem {
  key: ActivityType
  label: string
  icon: string
  badge?: number
}

const topActivities: ActivityItem[] = [
  { key: 'explorer', label: '资源管理器 (Ctrl+Shift+E)', icon: 'codicon:files' },
  { key: 'search', label: '搜索 (Ctrl+Shift+F)', icon: 'codicon:search' },
  { key: 'source-control', label: '源代码管理 (Ctrl+Shift+G)', icon: 'codicon:source-control', badge: 15 },
  { key: 'debug', label: '运行和调试 (Ctrl+Shift+D)', icon: 'codicon:debug-alt' },
  { key: 'remote-explorer', label: '远程资源管理器', icon: 'codicon:remote-explorer' },
  { key: 'extensions', label: '扩展 (Ctrl+Shift+X)', icon: 'codicon:extensions' },
  { key: 'testing', label: '测试', icon: 'codicon:beaker' },
]

function handleActivityClick(key: ActivityType) {
  // 设置页面直接在 Dockview 核心多向分屏区域作为 Tab 打开
  if (key === 'settings') {
    tpStore.openSettingsTab()
    return
  }
  layoutStore.setActiveActivity(key)
}

const isSettingsActive = computed(() => tpStore.activeTabId === 'workbench-settings')
</script>

<template>
  <aside
    :style="{
      backgroundColor: 'var(--wb-activitybar-bg, #181818)',
      borderColor: 'var(--wb-border-color, #2b2b2b)',
    }"
    class="h-full w-48px flex flex-col shrink-0 select-none items-center justify-between text-[#858585]"
  >
    <!-- 顶部主功能图标组 (带微距内边距) -->
    <div class="w-full flex flex-col items-center gap-1 pt-2">
      <NTooltip
        v-for="item in topActivities"
        :key="item.key"
        placement="right"
        trigger="hover"
      >
        <template #trigger>
          <div
            class="group relative h-35px w-35px flex cursor-pointer items-center justify-center rounded-md transition-all duration-150 focus:outline-none"
            :class="[
              layoutStore.activeActivity === item.key && layoutStore.sidebarVisible
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-[#858585] hover:bg-white/8 hover:text-white',
            ]"
            @click="handleActivityClick(item.key)"
          >
            <SvgIcon
              :icon="item.icon"
              class="text-20px transition-transform group-active:scale-95"
            />
          </div>
        </template>
        <span>{{ item.label }}</span>
      </NTooltip>
    </div>

    <!-- 底部辅助图标组 (账户、设置管理) -->
    <div class="w-full flex flex-col items-center gap-1 pb-2">
      <!-- 1. 账户 (使用 Naive UI NAvatar 头像组件 + NTooltip，带圆角按钮底色) -->
      <NTooltip placement="right" trigger="hover">
        <template #trigger>
          <div
            role="button"
            tabindex="0"
            class="group relative h-35px w-35px flex cursor-pointer items-center justify-center rounded-md transition-all duration-150 focus:outline-none"
            :class="[
              layoutStore.activeActivity === 'accounts' && layoutStore.sidebarVisible
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-[#858585] hover:bg-white/8 hover:text-white',
            ]"
            @click="handleActivityClick('accounts')"
          >
            <NAvatar
              round
              :size="22"
              class="cursor-pointer shadow-sm ring-1 ring-white/10 group-active:scale-95"
              :style="{ background: 'linear-gradient(135deg, #f43f5e, #f59e0b)' }"
            >
              <span class="text-11px text-white font-bold">
                {{ authStore.userInfo?.userName ? authStore.userInfo.userName.charAt(0).toUpperCase() : 'A' }}
              </span>
            </NAvatar>
          </div>
        </template>
        <span>账户</span>
      </NTooltip>

      <!-- 2. 设置与管理 (使用 SvgIcon + NBadge + NTooltip，带圆角按钮底色) -->
      <NTooltip placement="right" trigger="hover">
        <template #trigger>
          <div
            role="button"
            tabindex="0"
            class="group relative h-35px w-35px flex cursor-pointer items-center justify-center rounded-md transition-all duration-150 focus:outline-none"
            :class="[
              isSettingsActive
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-[#858585] hover:bg-white/8 hover:text-white',
            ]"
            @click="handleActivityClick('settings')"
          >
            <NBadge :value="1" :max="99" color="#007acc" :offset="[-2, 14]">
              <SvgIcon
                icon="codicon:settings-gear"
                class="text-20px transition-transform group-active:scale-95"
              />
            </NBadge>
          </div>
        </template>
        <span>管理 (首选项与设置)</span>
      </NTooltip>
    </div>
  </aside>
</template>
