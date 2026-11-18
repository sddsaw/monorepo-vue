<script setup lang="ts">
import { $t } from '@/locales'
import { useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'WorkbenchStatusBar',
})

const tpStore = useTpStore()

/** 是否展示状态栏（由环境变量 VITE_SHOW_STATUS_BAR 控制，默认在开发环境下展示） */
const showStatusBar = import.meta.env.VITE_SHOW_STATUS_BAR !== undefined
  ? import.meta.env.VITE_SHOW_STATUS_BAR === 'Y'
  : import.meta.env.DEV
</script>

<template>
  <footer
    v-if="showStatusBar"
    :style="{ backgroundColor: 'rgb(var(--layout-bg-color))' }"
    class="flex shrink-0 flex-wrap select-none items-center justify-between gap-x-3 px-3 text-base-text font-sans text-ui-11 min-h-ui-22"
  >
    <!-- 左侧状态项 -->
    <div class="min-w-0 flex flex-1 items-center gap-3">
      <!-- Git 分支 -->
      <div class="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-[var(--hover-color)]" :title="$t('workbench.statusbar.gitBranch')">
        <SvgIcon icon="ri:git-branch-line" class="text-ui-12" />
        <span class="font-mono">taui</span>
      </div>

      <!-- 错误/警告统计 -->
      <div class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-[var(--hover-color)]" :title="$t('workbench.statusbar.drcErrors')">
        <span class="flex items-center gap-0.5">
          <span>✕</span>
          <span class="font-mono">{{ tpStore.validationResult.errors.length }}</span>
        </span>
        <span class="flex items-center gap-0.5">
          <span>⚠</span>
          <span class="font-mono">0</span>
        </span>
      </div>

      <!-- 文件及未打开标签页状态展示 -->
      <div
        class="min-w-0 flex items-center gap-1.5 rounded px-1 py-0.5 text-[var(--text-muted)] font-mono"
        :title="tpStore.fileName ? (tpStore.activeTab ? $t('workbench.statusbar.currentFile', { file: tpStore.fileName }) : `${tpStore.fileName} (${$t('workbench.statusbar.unopenedTab')})`) : $t('workbench.statusbar.noFile')"
      >
        <SvgIcon icon="ri:file-code-line" class="text-[var(--text-muted)] text-ui-12" />
        <span class="truncate">{{ tpStore.fileName ? (tpStore.activeTab ? tpStore.fileName : `${tpStore.fileName} (${$t('workbench.statusbar.unopenedTab')})`) : $t('workbench.statusbar.noFile') }}</span>
      </div>
    </div>

    <!-- 右侧状态项 -->
    <div class="max-w-full min-w-0 flex flex-wrap items-center gap-x-3 font-mono text-ui-10">
      <!-- 未保存脏数据指示 -->
      <div v-if="tpStore.isDirty" class="flex animate-pulse items-center gap-1 text-warning font-bold">
        <span>●</span>
        <span>{{ $t('workbench.statusbar.unsavedChanges') }}</span>
      </div>

      <!-- 当前匹配的模块 -->
      <div v-if="tpStore.activeAdapter" class="min-w-0 truncate text-[var(--text-muted)]" :title="tpStore.activeAdapter.name">
        {{ tpStore.activeAdapter.name }}
      </div>

      <!-- 编码格式 -->
      <div class="text-[var(--text-muted)]">
        UTF-8
      </div>

      <!-- 客户端版本 -->
      <div class="text-[var(--text-muted)]">
        ATE Studio v2.3
      </div>
    </div>
  </footer>
</template>
