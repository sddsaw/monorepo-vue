<script setup lang="ts">
import { setupIconifyOffline } from '@/plugins/iconify'
import { useAuthStore } from '@/store/modules/auth'
import { type ActivityType, useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'

// 确保在 HMR 或组件加载时，最新的 codicon 本地集合立即注册生效
setupIconifyOffline()

const layoutStore = useWorkbenchLayoutStore()
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
  { key: 'source-control', label: '源代码管理 (Ctrl+Shift+G)', icon: 'codicon:source-control' },
  { key: 'debug', label: '运行和调试 (Ctrl+Shift+D)', icon: 'codicon:debug-alt' },
  { key: 'remote-explorer', label: '远程资源管理器', icon: 'codicon:remote-explorer' },
  { key: 'extensions', label: '扩展 (Ctrl+Shift+X)', icon: 'codicon:extensions' },
  { key: 'testing', label: '测试', icon: 'codicon:beaker' },
]

function handleActivityClick(key: ActivityType) {
  layoutStore.setActiveActivity(key)
}
</script>

<template>
  <aside
    :style="{
      backgroundColor: 'var(--wb-activitybar-bg, #181818)',
      borderColor: 'var(--wb-border-color, #2b2b2b)',
    }"
    class="z-20 h-full w-48px flex flex-col shrink-0 select-none items-center justify-between border-r text-[#858585]"
  >
    <!-- 顶部主功能图标组 -->
    <div class="w-full flex flex-col items-center">
      <NTooltip
        v-for="item in topActivities"
        :key="item.key"
        placement="right"
        trigger="hover"
      >
        <template #trigger>
          <div
            role="button"
            tabindex="0"
            class="group relative h-48px w-48px flex cursor-pointer items-center justify-center bg-transparent transition-colors focus:outline-none"
            :class="[
              layoutStore.activeActivity === item.key && layoutStore.sidebarVisible
                ? 'text-white'
                : 'text-[#858585] hover:text-white',
            ]"
            @click="handleActivityClick(item.key)"
          >
            <!-- VS Code 经典的左侧活动高亮指示线 -->
            <span
              v-if="layoutStore.activeActivity === item.key && layoutStore.sidebarVisible"
              class="absolute bottom-0 left-0 top-0 w-2px bg-white"
            />

            <!-- 项目 UI 库 NBadge 徽章组件 -->
            <NBadge
              :value="item.badge"
              :max="99"
              :show-zero="false"
              color="#007acc"
              :offset="[-2, 14]"
            >
              <SvgIcon
                :icon="item.icon"
                class="text-24px transition-transform group-active:scale-95"
              />
            </NBadge>
          </div>
        </template>
        <span>{{ item.label }}</span>
      </NTooltip>
    </div>

    <!-- 底部辅助图标组 (账户、设置管理) -->
    <div class="w-full flex flex-col items-center pb-1">
      <!-- 1. 账户 (使用 Naive UI NAvatar 头像组件 + NBadge 徽章 + NTooltip) -->
      <NTooltip placement="right" trigger="hover">
        <template #trigger>
          <div
            role="button"
            tabindex="0"
            class="group relative h-48px w-48px flex cursor-pointer items-center justify-center bg-transparent transition-colors focus:outline-none"
            :class="[
              layoutStore.activeActivity === 'accounts' && layoutStore.sidebarVisible
                ? 'text-white'
                : 'text-[#858585] hover:text-white',
            ]"
            @click="handleActivityClick('accounts')"
          >
            <span
              v-if="layoutStore.activeActivity === 'accounts' && layoutStore.sidebarVisible"
              class="absolute bottom-0 left-0 top-0 w-2px bg-white"
            />

            <NBadge :value="1" :max="99" color="#007acc" :offset="[-2, 14]">
              <NAvatar
                round
                :size="24"
                class="cursor-pointer shadow-sm ring-1 ring-white/10 group-active:scale-95"
                :style="{ background: 'linear-gradient(135deg, #f43f5e, #f59e0b)' }"
              >
                <span class="text-11px text-white font-bold">
                  {{ authStore.userInfo?.userName ? authStore.userInfo.userName.charAt(0).toUpperCase() : 'A' }}
                </span>
              </NAvatar>
            </NBadge>
          </div>
        </template>
        <span>账户</span>
      </NTooltip>

      <!-- 2. 设置与管理 (使用 SvgIcon + NBadge + NTooltip) -->
      <NTooltip placement="right" trigger="hover">
        <template #trigger>
          <div
            role="button"
            tabindex="0"
            class="group relative h-48px w-48px flex cursor-pointer items-center justify-center bg-transparent transition-colors focus:outline-none"
            :class="[
              layoutStore.activeActivity === 'settings' && layoutStore.sidebarVisible
                ? 'text-white'
                : 'text-[#858585] hover:text-white',
            ]"
            @click="handleActivityClick('settings')"
          >
            <span
              v-if="layoutStore.activeActivity === 'settings' && layoutStore.sidebarVisible"
              class="absolute bottom-0 left-0 top-0 w-2px bg-white"
            />

            <NBadge :value="1" :max="99" color="#007acc" :offset="[-2, 14]">
              <SvgIcon
                icon="codicon:settings-gear"
                class="text-24px transition-transform group-active:scale-95"
              />
            </NBadge>
          </div>
        </template>
        <span>管理 (首选项与设置)</span>
      </NTooltip>
    </div>
  </aside>
</template>
