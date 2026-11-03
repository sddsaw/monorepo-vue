<script setup lang="ts">
import { computed } from 'vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import ExplorerTree from './ExplorerTree.vue'

interface Props {
  width?: number
  isResizing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 240,
  isResizing: false,
})

const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

const titleText = computed(() => {
  switch (layoutStore.activeActivity) {
    case 'explorer':
      return '资源管理器'
    case 'search':
      return '全局检索'
    case 'source-control':
      return '源代码管理'
    case 'debug':
      return '运行和调试'
    case 'remote-explorer':
      return '远程资源管理器'
    case 'extensions':
      return '扩展'
    case 'testing':
      return '测试'
    case 'settings':
      return '首选项与设置'
    case 'accounts':
      return '账户与配置'
    default:
      return '资源管理器'
  }
})
</script>

<template>
  <aside
    :style="{
      width: layoutStore.sidebarVisible ? `${props.width}px` : '0px',
      opacity: layoutStore.sidebarVisible ? 1 : 0,
      backgroundColor: 'var(--wb-activitybar-bg, #181818)',
      borderColor: 'var(--wb-border-color, #2b2b2b)',
    }"
    class="relative h-full flex flex-col shrink-0 select-none overflow-hidden border-l"
    :class="[!props.isResizing ? 'transition-[width,opacity] duration-220 ease-[cubic-bezier(0.25,1,0.5,1)]' : '']"
  >
    <!-- 内部固定宽度容器，防止折叠动画时内容换行错位 -->
    <div
      :style="{ width: `${props.width}px` }"
      class="h-full flex flex-col shrink-0"
    >
      <!-- 侧栏顶部标题栏 -->
      <div
        :style="{ borderColor: 'var(--wb-border-color, #2d2d2d)' }"
        class="h-32px flex shrink-0 items-center justify-between border-b px-3 text-xs text-gray-400 font-semibold tracking-wider uppercase"
      >
        <span class="text-11px text-gray-300">{{ titleText }}</span>

        <div v-if="layoutStore.activeActivity === 'explorer'" class="flex items-center gap-1">
          <button
            type="button"
            class="cursor-pointer rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
            title="打开文件"
            @click="tpStore.chooseAndOpenFile"
          >
            <SvgIcon icon="ri:folder-open-line" class="text-12px" />
          </button>
        </div>
      </div>

      <!-- 侧栏主体视图 -->
      <div class="flex-1 overflow-hidden">
        <!-- 1. 资源管理器树 -->
        <ExplorerTree v-if="layoutStore.activeActivity === 'explorer'" />

        <!-- 2. 设置与偏好引导 (主体在 Dockview 核心分屏区展示) -->
        <div
          v-else-if="layoutStore.activeActivity === 'settings'"
          class="h-full flex flex-col items-center justify-center gap-3 p-4 text-center text-xs text-gray-400"
        >
          <div class="border border-white/10 rounded-full bg-white/5 p-3">
            <SvgIcon icon="codicon:settings-gear" class="text-28px text-blue-400" />
          </div>
          <div>
            <div class="mb-1 text-sm text-gray-200 font-medium">
              首选项与设置
            </div>
            <div class="text-11px text-gray-500 leading-relaxed">
              主题与偏好设置已迁移至中心多向分屏区域编辑。
            </div>
          </div>
          <NButton size="small" type="primary" secondary @click="tpStore.openSettingsTab">
            在分屏工作区打开
          </NButton>
        </div>

        <!-- 3. 其他活动视图占位 -->
        <div v-else class="p-4 text-xs text-gray-500">
          <div class="mb-2 text-gray-300 font-medium">
            {{ titleText }}
          </div>
          <p v-if="layoutStore.activeActivity === 'search'">
            搜索功能支持测试项跨文件检索与快速过滤。
          </p>
          <p v-else-if="layoutStore.activeActivity === 'source-control'">
            版本控制面板，支持 Git 代码变更检视与提交。
          </p>
          <p v-else-if="layoutStore.activeActivity === 'debug'">
            自动化测试流断点调试、变量观察与调用栈。
          </p>
          <p v-else-if="layoutStore.activeActivity === 'remote-explorer'">
            远程测试机台与工控仪器连接管理。
          </p>
          <p v-else-if="layoutStore.activeActivity === 'extensions'">
            ATE 插件扩展市场与自定义脚本生态。
          </p>
          <p v-else-if="layoutStore.activeActivity === 'testing'">
            测试套件执行、用例树与测试覆盖率视图。
          </p>
          <p v-else-if="layoutStore.activeActivity === 'accounts'">
            当前已登录账号配置及跨工作台同步。
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
