<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { NModal, NScrollbar } from 'naive-ui'
import { computed, shallowRef } from 'vue'
import { $t } from '@/locales'
import SettingsAbout from './SettingsAbout.vue'
import SettingsAppearance from './SettingsAppearance.vue'

defineOptions({ name: 'SettingsView' })

const show = defineModel<boolean>('show', { default: false })
const pages = { appearance: SettingsAppearance, about: SettingsAbout }
type NavKey = keyof typeof pages
const activeNav = shallowRef<NavKey>('appearance')
const navItems = computed(() => [
  { key: 'appearance' as const, label: $t('workbench.settings.appearance'), icon: 'ri:palette-line' },
  { key: 'about' as const, label: $t('workbench.settings.aboutUs'), icon: 'ri:information-line' },
])
const activeTitle = computed(() => navItems.value.find(item => item.key === activeNav.value)!.label)
</script>

<template>
  <NModal
    v-model:show="show"
    preset="card"
    :aria-label="$t('workbench.settings.title')"
    draggable
    closable
    close-focusable
    content-class="settings-modal-body"
    header-class="settings-modal-header"
    class="settings-modal !overflow-hidden !rounded-[var(--theme-radius)] !bg-container"
  >
    <template #header>
      <div class="flex items-center gap-8px text-base-text font-600 text-ui-16">
        <SvgIcon icon="ri:settings-3-line" class="text-primary text-ui-20" aria-hidden="true" />
        {{ $t('workbench.settings.title') }}
      </div>
    </template>

    <aside class="settings-nav shrink-0 border-r border-[var(--border-color)] bg-layout p-12px">
      <nav :aria-label="$t('workbench.settings.title')" class="flex flex-col gap-4px">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          :aria-current="activeNav === item.key ? 'page' : undefined"
          aria-controls="settings-page"
          class="settings-nav-button relative w-full flex items-center gap-8px border-0 rounded-[var(--theme-radius)] px-12px py-8px text-left font-500 text-ui-14 min-h-ui-36"
          :class="activeNav === item.key
            ? 'bg-[var(--active-color)] text-primary'
            : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--hover-color)] hover:text-base-text'"
          @click="activeNav = item.key"
        >
          <span v-if="activeNav === item.key" class="absolute bottom-8px left-0 top-8px w-3px rounded-full bg-primary" aria-hidden="true" />
          <SvgIcon :icon="item.icon" class="shrink-0 text-ui-16" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <section id="settings-page" class="settings-content min-h-0 min-w-0 flex flex-col flex-1 bg-container" aria-labelledby="settings-page-title">
      <header class="shrink-0 border-b border-[var(--border-color)] px-24px py-16px">
        <h2 id="settings-page-title" class="m-0 text-base-text font-600 text-ui-16">
          {{ activeTitle }}
        </h2>
      </header>
      <!-- A new scroll container starts each selected page at its own heading. -->
      <NScrollbar :key="activeNav" class="min-h-0 flex-1" content-class="settings-page-content">
        <component :is="pages[activeNav]" />
      </NScrollbar>
    </section>
  </NModal>
</template>

<style scoped>
:global(.settings-modal) {
  container: settings / inline-size;
  width: min(880px, calc(94vw / var(--app-zoom, 1)));
  height: min(720px, calc(90dvh / var(--app-zoom, 1)));
  max-width: calc(94vw / var(--app-zoom, 1));
}

:global(.settings-modal .settings-modal-header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

:global(.settings-modal .settings-modal-body) {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

:global(.settings-modal .settings-page-content) {
  padding: 24px;
}

.settings-nav {
  width: 176px;
  overflow-y: auto;
}

.settings-nav-button {
  cursor: pointer;
  transition: background-color 150ms, color 150ms;
}

.settings-nav-button:focus-visible {
  outline: 2px solid rgb(var(--primary-color));
  outline-offset: 2px;
}

@container settings (max-width: 640px) {
  :global(.settings-modal .settings-modal-body) {
    flex-direction: column;
  }

  .settings-nav {
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
    padding: 8px 12px;
  }

  .settings-nav nav {
    flex-direction: row;
  }

  .settings-nav-button {
    width: auto;
  }

  :global(.settings-modal .settings-page-content) {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-nav-button {
    transition: none;
  }
}
</style>
