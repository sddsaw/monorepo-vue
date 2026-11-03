<script setup lang="ts">
import type { DockviewApi, DockviewGroupPanel, DockviewGroupPanelApi } from 'dockview-vue'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useTpStore } from '@/store/modules/tp'

const props = defineProps<{
  params: {
    containerApi: DockviewApi
    api: DockviewGroupPanelApi
    group: DockviewGroupPanel
  }
}>()

setupIconifyOffline()

const tpStore = useTpStore()

/** 将当前活动面板向右拆分至新分屏组 (若当前组仅有一个面板则不拆分) */
function handleSplitRight() {
  const { containerApi, group } = props.params
  const activePanel = group.activePanel
  if (!activePanel || group.panels.length < 2)
    return

  const targetGroup = containerApi.addGroup({
    referenceGroup: group,
    direction: 'right',
  })
  activePanel.api.moveTo({ group: targetGroup })
}

/** 关闭当前分组内所有未固定的标签页 */
function handleCloseGroupPanels() {
  const panels = [...props.params.group.panels]
  panels.forEach((p) => {
    if (!tpStore.isTabPinned(p.id)) {
      p.api.close()
    }
  })
}
</script>

<template>
  <div class="h-full flex select-none items-center gap-1 px-2">
    <button
      type="button"
      class="size-24px flex cursor-pointer items-center justify-center rounded-4px text-[var(--wb-text-secondary,#9d9d9d)] transition-colors hover:bg-black/8 hover:text-[var(--wb-text-color,#ffffff)] dark:hover:bg-white/10"
      title="向右拆分编辑器 (需打开至少2个标签页)"
      @click="handleSplitRight"
    >
      <SvgIcon icon="ri:layout-right-line" class="text-15px" />
    </button>

    <button
      type="button"
      class="size-24px flex cursor-pointer items-center justify-center rounded-4px text-[var(--wb-text-secondary,#9d9d9d)] transition-colors hover:bg-black/8 hover:text-[var(--wb-text-color,#ffffff)] dark:hover:bg-white/10"
      title="关闭组内未固定标签页"
      @click="handleCloseGroupPanels"
    >
      <SvgIcon icon="codicon:close" class="text-15px" />
    </button>
  </div>
</template>
