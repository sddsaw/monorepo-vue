<script setup lang="ts">
import type { ThemePreset } from '@/theme/presets'
import { computed } from 'vue'
import { $t, i18n } from '@/locales'
import { useThemeStore } from '@/store/modules/theme'
import { resolveThemePreset } from '@/theme/presets'
import { themeSettings } from '@/theme/settings'

const props = withDefaults(defineProps<{
  /** 工作台仅应用外观，保留布局和水印等个人设置。 */
  appearanceOnly?: boolean
}>(), { appearanceOnly: false })

const presetModules = import.meta.glob<ThemePreset>('@/theme/preset/*.json', { eager: true, import: 'default' })
const themeStore = useThemeStore()
// 与 locales.$t 相同，避免对开放的预设键递归展开整份语言 Schema。
const hasTranslation = i18n.global.te as (key: string) => boolean

const presets = computed(() => Object.entries(presetModules)
  .filter(([, preset]) => !props.appearanceOnly || preset.themeScheme)
  .map(([path, preset]) => {
    const id = path.split('/').pop()?.replace('.json', '') || ''
    const settings = resolveThemePreset(preset, themeSettings).settings
    const colors = { ...settings.tokens.light.colors, ...(settings.themeScheme === 'dark' ? settings.tokens.dark?.colors : {}) }
    const nameKey = `theme.appearance.preset.${id}.name` as const
    const descKey = `theme.appearance.preset.${id}.desc` as const
    return {
      id,
      preset,
      settings,
      colors,
      name: hasTranslation(nameKey) ? $t(nameKey) : preset.name,
      desc: hasTranslation(descKey) ? $t(descKey) : preset.desc,
    }
  })
  .sort((a, b) => {
    if (a.id === 'default')
      return -1
    if (b.id === 'default')
      return 1
    return a.preset.name.localeCompare(b.preset.name)
  }))

function applyPreset(preset: ThemePreset) {
  themeStore.applyPreset(preset, props.appearanceOnly)
  window.$message?.success($t('theme.appearance.preset.applySuccess'))
}
</script>

<template>
  <section class="space-y-3">
    <div class="text-[var(--text-muted)] font-semibold text-ui-11">
      {{ $t('theme.appearance.preset.title') }}
    </div>
    <p v-if="appearanceOnly" class="m-0 text-[var(--text-muted)] text-ui-11">
      {{ $t('theme.appearance.preset.appearanceHint') }}
    </p>
    <div class="flex flex-col gap-2">
      <div
        v-for="{ id, preset, settings, colors, name, desc } in presets"
        :key="id"
        class="flex items-center gap-3 border border-[var(--border-color)] rounded-[var(--theme-radius)] p-3"
      >
        <div
          aria-hidden="true"
          class="preset-preview shrink-0"
          :style="{ backgroundColor: colors.layout, color: settings.themeColor, borderRadius: `${settings.themeRadius}px` }"
        >
          <div class="preview-toolbar" />
          <div class="preview-panels">
            <div class="preview-tree" :style="{ backgroundColor: colors.container }">
              <i /><i /><i />
            </div>
            <div class="preview-editor" :style="{ backgroundColor: colors.container }">
              <i />
            </div>
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-base-text font-medium text-ui-13">
            {{ name }}
          </div>
          <p class="m-0 mt-1 text-[var(--text-muted)] text-ui-11">
            {{ desc }}
          </p>
        </div>
        <NButton
          size="small"
          :aria-label="`${$t('theme.appearance.preset.apply')} ${name}`"
          @click="applyPreset(preset)"
        >
          {{ $t('theme.appearance.preset.apply') }}
        </NButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preset-preview {
  width: 72px;
  height: 48px;
  overflow: hidden;
  border: 1px solid rgb(128 128 128 / 30%);
}

.preview-toolbar {
  height: 9px;
  border-bottom: 1px solid rgb(128 128 128 / 20%);
}

.preview-panels {
  display: flex;
  gap: 2px;
  height: 37px;
  padding: 2px;
}

.preview-tree {
  width: 21px;
  padding: 4px 3px;
}

.preview-tree i {
  display: block;
  height: 2px;
  margin-bottom: 4px;
  background: #aaa;
}

.preview-editor {
  flex: 1;
  padding: 5px 3px;
}

.preview-editor i {
  display: block;
  height: 4px;
  background: currentColor;
}
</style>
