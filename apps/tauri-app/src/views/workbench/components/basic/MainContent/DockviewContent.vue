<script setup lang="ts">
import type { WbTabItem } from '@/store/modules/tp'
import { computed } from 'vue'
import { useThemeStore } from '@/store/modules/theme'
import EditorBreadcrumb from './EditorBreadcrumb.vue'
import MainContent from './index.vue'

defineProps<{ tab: WbTabItem }>()
const emit = defineEmits<{ activate: [] }>()
const themeStore = useThemeStore()
const wrapperScroll = computed(() => themeStore.layout.scrollMode === 'wrapper')
</script>

<template>
  <section
    class="dock-content h-full min-h-0 min-w-0 flex flex-col bg-container"
    :class="{ 'dock-content--wrapper': wrapperScroll }"
    @pointerdown.capture="emit('activate')"
    @focusin="emit('activate')"
  >
    <EditorBreadcrumb
      :tab="tab"
      class="shrink-0"
      :class="{ 'dock-content__heading--fixed': wrapperScroll && themeStore.fixedHeaderAndTab }"
    />
    <div class="dock-content__body min-h-0 flex-1">
      <MainContent :tab="tab" />
    </div>
  </section>
</template>

<style scoped>
.dock-content {
  zoom: var(--app-zoom);
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.dock-content__body {
  overflow: auto;
}

.dock-content--wrapper {
  overflow: auto;
}

.dock-content--wrapper .dock-content__body {
  flex: 1 0 auto;
  overflow: visible;
}

.dock-content__heading--fixed {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
