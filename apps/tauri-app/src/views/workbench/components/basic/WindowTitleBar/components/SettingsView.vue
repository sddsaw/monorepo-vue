<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import { SvgIcon } from '@sa/components'
import {
  NButton,
  NColorPicker,
  NInputNumber,
  NModal,
  NRadioButton,
  NRadioGroup,
  NScrollbar,
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { themeTabModeOptions } from '@/constants/app'
import SettingItem from '@/layouts/modules/theme-drawer/components/setting-item.vue'
import { $t } from '@/locales'
import { useAppStore } from '@/store/modules/app'
import { useThemeStore } from '@/store/modules/theme'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { applyInterfaceFont, WORKBENCH_SETTINGS_STORAGE_KEY } from '@/theme/interface-font'
import FontSizeSetting from './FontSizeSetting.vue'

defineOptions({
  name: 'SettingsView',
})

/** 弹窗显隐控制（双向绑定） */
const show = defineModel<boolean>('show', { default: false })

// ─── 1. Store 与基础状态 ───
const appStore = useAppStore()
const themeStore = useThemeStore()
const layoutStore = useWorkbenchLayoutStore()
const message = useMessage()

// ─── 2. 状态存储与初始化 ───
const STORAGE_KEY = WORKBENCH_SETTINGS_STORAGE_KEY

function loadSavedSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  }
  catch {
    return {}
  }
}
const saved = loadSavedSettings()

/** 语言切换：与 appStore 保持双向联动 */
const selectedLanguage = computed({
  get: () => appStore.locale,
  set: (val: 'zh-CN' | 'en-US') => {
    appStore.changeLocale(val)
    persistSettings()
  },
})

/** 外观与布局相关配置项统一管理 */
const settings = reactive({
  interfaceFont: saved.interfaceFont || 'dbx-default',
  layout: saved.layout || 'compact',
})

const zoomPercent = computed<number | null>({
  get: () => Math.round(layoutStore.zoomLevel * 100),
  set: (value) => {
    if (value !== null)
      layoutStore.setZoomLevel(value / 100)
  },
})

/** 本地持久化配置 */
function persistSettings() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...settings,
        language: selectedLanguage.value,
      }),
    )
  }
  catch {}
}

/** 联动应用外观变量与主题效果 */
function applyAppearanceEffects() {
  persistSettings()
  applyInterfaceFont(settings.interfaceFont)
}

onMounted(() => {
  applyAppearanceEffects()
})

// ─── 3. UI 下拉选项数据源 ───
const languageOptions: SelectOption[] = [
  { label: '🇨🇳 简体中文', value: 'zh-CN' },
  { label: '🇺🇸 English', value: 'en-US' },
]

const themeColor = computed({
  get: () => themeStore.themeColor,
  set: (color: string) => themeStore.updateThemeColors('primary', color),
})

const themeScheme = computed({
  get: () => themeStore.themeScheme,
  set: (scheme: UnionKey.ThemeScheme) => themeStore.setThemeScheme(scheme),
})

const themeSwatches = ['#007acc', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#14b8a6']

const tabModeOptions = computed(() => themeTabModeOptions.map(option => ({
  ...option,
  label: $t(`theme.layout.tab.mode.${option.value}` as const),
})))

const interfaceFontOptions: SelectOption[] = [
  { label: 'DBX Default', value: 'dbx-default' },
  { label: 'System Default', value: 'system-default' },
  { label: '思源宋体 · Noto Serif SC', value: 'noto-serif-sc' },
  { label: '思源黑体 · Noto Sans SC', value: 'noto-sans-sc' },
  { label: 'Inter, system-ui', value: 'Inter' },
  { label: 'PingFang SC, Microsoft YaHei', value: 'PingFang SC' },
  { label: 'Segoe UI, Roboto', value: 'Segoe UI' },
]

// ─── 4. 侧边栏导航项 ───
type NavKey = 'appearance' | 'content' | 'about'
const activeNav = ref<NavKey>('appearance')

const navTabs = computed(() => [
  {
    key: 'appearance' as NavKey,
    label: $t('workbench.settings.appearance'),
    icon: 'ri:palette-line',
  },
  {
    key: 'content' as NavKey,
    label: $t('theme.layout.content.title'),
    icon: 'ri:layout-bottom-line',
  },
  {
    key: 'about' as NavKey,
    label: $t('workbench.settings.aboutUs'),
    icon: 'ri:information-line',
  },
])

// 检查更新状态
const isCheckingUpdate = ref(false)
function handleCheckUpdate() {
  if (isCheckingUpdate.value)
    return
  isCheckingUpdate.value = true
  setTimeout(() => {
    isCheckingUpdate.value = false
    message.success($t('workbench.settings.latestVersion'))
  }, 800)
}
</script>

<template>
  <NModal
    v-model:show="show"
    preset="card"
    :bordered="false"
    :closable="true"
    :mask-closable="true"
    transform-origin="center"
    class="settings-modal shadow-[0_20px_50px_rgba(0,0,0,0.6)] !overflow-hidden !rounded-[var(--theme-radius)] !bg-container !p-0"
    header-style="position: absolute; right: 12px; top: 12px; z-index: 50; padding: 0;"
    content-style="padding: 0; height: 100%; display: flex; overflow: hidden;"
    @close="show = false"
  >
    <!-- ─── 1. 左侧导航侧边栏 ─── -->
    <aside class="settings-nav h-full w-180px flex flex-col shrink-0 select-none border-r border-[var(--border-color)] bg-layout p-3 pt-4">
      <nav class="flex flex-col gap-1.5">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          type="button"
          class="relative w-full flex cursor-pointer items-center gap-2.5 rounded-[var(--theme-radius)] px-3 py-2 text-left font-medium transition-all duration-200 text-ui-13"
          :class="[
            activeNav === tab.key
              ? 'bg-[var(--hover-color)] text-base-text shadow-sm'
              : 'text-[var(--text-muted)] hover:bg-[var(--hover-color)] hover:text-base-text',
          ]"
          @click="activeNav = tab.key"
        >
          <!-- 选中指示竖条 -->
          <span
            v-if="activeNav === tab.key"
            class="absolute left-1 h-3.5 w-1 rounded-full bg-primary"
          />
          <SvgIcon :icon="tab.icon" class="text-ui-15" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- ─── 2. 右侧主体内容区 (固定高度，内置 NScrollbar 平滑滚动条) ─── -->
    <main class="settings-content relative h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-container">
      <NScrollbar class="h-full" content-style="padding: 24px 32px 24px 24px;">
        <Transition name="content-slide" mode="out-in">
          <!-- ─── 视图 A: 外观设置 ─── -->
          <div v-if="activeNav === 'appearance'" key="appearance" class="space-y-6">
            <!-- 分组 1: 主题与视觉模式 -->
            <section class="space-y-3">
              <div class="text-[var(--text-muted)] font-semibold tracking-wider uppercase text-ui-11">
                {{ $t('workbench.settings.themeAndColor') }}
              </div>

              <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3.5 space-y-2">
                <!-- 配色方案 -->
                <div class="settings-row flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-base-text font-medium text-ui-13">
                      {{ $t('workbench.settings.colorTheme') }}
                    </div>
                    <div class="text-[var(--text-muted)] text-ui-11">
                      {{ $t('workbench.settings.colorThemeDesc') }}
                    </div>
                  </div>
                  <div class="max-w-full w-190px shrink-0">
                    <NColorPicker
                      v-model:value="themeColor"
                      :show-alpha="false"
                      :modes="['hex']"
                      :swatches="themeSwatches"
                      size="small"
                    />
                  </div>
                </div>

                <div class="h-[1px] w-full bg-[var(--hover-color)]" />

                <!-- 主题模式 (Light / Dark / System) -->
                <div class="settings-row flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-base-text font-medium text-ui-13">
                      {{ $t('workbench.settings.appearanceMode') }}
                    </div>
                    <div class="text-[var(--text-muted)] text-ui-11">
                      {{ $t('workbench.settings.appearanceModeDesc') }}
                    </div>
                  </div>
                  <NRadioGroup
                    v-model:value="themeScheme"
                    size="small"
                    class="settings-modes flex"
                  >
                    <NRadioButton value="light" class="flex-1 text-center text-ui-12">
                      <div class="flex items-center justify-center gap-1">
                        <SvgIcon icon="ri:sun-line" />
                        <span>{{ $t('workbench.settings.light') }}</span>
                      </div>
                    </NRadioButton>
                    <NRadioButton value="dark" class="flex-1 text-center text-ui-12">
                      <div class="flex items-center justify-center gap-1">
                        <SvgIcon icon="ri:moon-line" />
                        <span>{{ $t('workbench.settings.dark') }}</span>
                      </div>
                    </NRadioButton>
                    <NRadioButton value="auto" class="flex-1 text-center text-ui-12">
                      <div class="flex items-center justify-center gap-1">
                        <SvgIcon icon="ri:magic-line" />
                        <span>{{ $t('workbench.settings.auto') }}</span>
                      </div>
                    </NRadioButton>
                  </NRadioGroup>
                </div>
              </div>
            </section>

            <!-- 分组 2: 界面与排版 -->
            <section class="space-y-3">
              <div class="text-[var(--text-muted)] font-semibold tracking-wider uppercase text-ui-11">
                {{ $t('workbench.settings.displayAndTypography') }}
              </div>

              <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3.5 space-y-2">
                <!-- 语言设置 -->
                <div class="settings-row flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-base-text font-medium text-ui-13">
                      {{ $t('workbench.settings.language') }}
                    </div>
                    <div class="text-[var(--text-muted)] text-ui-11">
                      {{ $t('workbench.settings.languageDesc') }}
                    </div>
                  </div>
                  <NSelect
                    v-model:value="selectedLanguage"
                    :options="languageOptions"
                    size="small"
                    class="w-190px"
                  />
                </div>

                <div class="h-[1px] w-full bg-[var(--hover-color)]" />

                <!-- 界面缩放 -->
                <div class="settings-row flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-base-text font-medium text-ui-13">
                      {{ $t('workbench.settings.zoom') }}
                    </div>
                    <div class="text-[var(--text-muted)] text-ui-11">
                      {{ $t('workbench.settings.zoomDesc') }}
                    </div>
                  </div>
                  <NInputNumber
                    v-model:value="zoomPercent"
                    :min="60"
                    :max="200"
                    :step="10"
                    size="small"
                    class="w-190px"
                  >
                    <template #suffix>
                      %
                    </template>
                  </NInputNumber>
                </div>

                <div class="h-[1px] w-full bg-[var(--hover-color)]" />

                <!-- 界面字体 -->
                <div class="settings-row flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-base-text font-medium text-ui-13">
                      {{ $t('workbench.settings.interfaceFont') }}
                    </div>
                    <div class="text-[var(--text-muted)] text-ui-11">
                      {{ $t('workbench.settings.interfaceFontDesc') }}
                    </div>
                  </div>
                  <NSelect
                    v-model:value="settings.interfaceFont"
                    :options="interfaceFontOptions"
                    size="small"
                    class="w-190px"
                    @update:value="applyAppearanceEffects"
                  />
                </div>
                <div class="h-[1px] w-full bg-[var(--hover-color)]" />
                <FontSizeSetting :value="themeStore.fontSize" @update:value="themeStore.setFontSize" />
              </div>
            </section>

            <!-- 分组 3: 布局与微风格 -->
            <section class="space-y-3">
              <div class="text-[var(--text-muted)] font-semibold tracking-wider uppercase text-ui-11">
                {{ $t('workbench.settings.frameAndLayout') }}
              </div>

              <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3.5 space-y-2">
                <!-- 圆角风格 -->
                <div class="settings-row flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-base-text font-medium text-ui-13">
                      {{ $t('workbench.settings.borderRadius') }}
                    </div>
                    <div class="text-[var(--text-muted)] text-ui-11">
                      {{ $t('workbench.settings.borderRadiusDesc') }}
                    </div>
                  </div>
                  <NInputNumber
                    :value="themeStore.themeRadius"
                    :min="0"
                    :max="20"
                    size="small"
                    class="w-190px"
                    @update:value="themeStore.themeRadius = $event ?? 6"
                  >
                    <template #suffix>
                      px
                    </template>
                  </NInputNumber>
                </div>

                <div class="h-[1px] w-full bg-[var(--hover-color)]" />

                <!-- 界面布局方案 -->
                <div class="settings-row flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-base-text font-medium text-ui-13">
                      {{ $t('workbench.settings.tabLayout') }}
                    </div>
                    <div class="text-[var(--text-muted)] text-ui-11">
                      {{ $t('workbench.settings.tabLayoutDesc') }}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="border rounded-[var(--theme-radius)] px-3 py-1.5 font-medium transition-all duration-150 text-ui-12"
                      :class="[
                        settings.layout === 'modern'
                          ? 'border-primary bg-primary/15 text-base-text'
                          : 'border-[var(--border-color)] bg-[var(--hover-color)] text-[var(--text-muted)] hover:text-base-text',
                      ]"
                      @click="settings.layout = 'modern'; persistSettings()"
                    >
                      {{ $t('workbench.settings.modern') }}
                    </button>
                    <button
                      type="button"
                      class="border rounded-[var(--theme-radius)] px-3 py-1.5 font-medium transition-all duration-150 text-ui-12"
                      :class="[
                        settings.layout === 'compact'
                          ? 'border-primary bg-primary/15 text-base-text'
                          : 'border-[var(--border-color)] bg-[var(--hover-color)] text-[var(--text-muted)] hover:text-base-text',
                      ]"
                      @click="settings.layout = 'compact'; persistSettings()"
                    >
                      {{ $t('workbench.settings.compact') }}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div v-else-if="activeNav === 'content'" key="content" class="space-y-6">
            <SettingItem :label="$t('theme.layout.tab.mode.title')">
              <NSelect v-model:value="themeStore.tab.mode" :options="tabModeOptions" size="small" class="w-150px" />
            </SettingItem>
          </div>

          <!-- ─── 视图 B: 关于我们 ─── -->
          <div v-else-if="activeNav === 'about'" key="about" class="space-y-5">
            <!-- 头部产品徽章卡片 -->
            <div class="relative overflow-hidden border border-[var(--border-color)] rounded-[var(--theme-radius)] from-container to-container bg-gradient-to-br p-5">
              <div class="flex items-center gap-4">
                <div class="size-13 flex shrink-0 items-center justify-center rounded-[var(--theme-radius)] from-primary to-primary bg-gradient-to-tr shadow-lg shadow-primary/20">
                  <SvgIcon icon="ri:macbook-line" class="text-base-text text-ui-26" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2.5">
                    <h3 class="text-base-text font-bold tracking-tight text-ui-16">
                      {{ $t('workbench.settings.aboutTitle') }}
                    </h3>
                    <NTag size="small" type="primary" round :bordered="false" class="font-mono text-ui-11">
                      v2.3.1
                    </NTag>
                  </div>
                  <p class="mt-1 text-[var(--text-muted)] leading-relaxed text-ui-12">
                    {{ $t('workbench.settings.aboutDesc') }}
                  </p>
                </div>
              </div>

              <div class="mt-4 flex items-center gap-2.5 pt-1">
                <NButton type="primary" size="small" :loading="isCheckingUpdate" @click="handleCheckUpdate">
                  {{ isCheckingUpdate ? $t('workbench.settings.checkingUpdates') : $t('workbench.settings.checkUpdates') }}
                </NButton>
                <NButton tag="a" href="https://github.com/soybeanjs/soybean-admin" target="_blank" size="small" secondary>
                  {{ $t('workbench.settings.repository') }}
                </NButton>
              </div>
            </div>

            <!-- 技术底座概览 -->
            <div class="space-y-2">
              <div class="text-[var(--text-muted)] font-semibold tracking-wider uppercase text-ui-11">
                {{ $t('workbench.settings.specifications') }}
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
                  <div class="text-[var(--text-muted)] text-ui-11">
                    {{ $t('workbench.settings.engine') }}
                  </div>
                  <div class="mt-0.5 text-base-text font-semibold text-ui-13">
                    Tauri 2.2 (Rust Core)
                  </div>
                </div>

                <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
                  <div class="text-[var(--text-muted)] text-ui-11">
                    {{ $t('workbench.settings.uiStack') }}
                  </div>
                  <div class="mt-0.5 text-base-text font-semibold text-ui-13">
                    Vue 3.5 + Vite + TypeScript
                  </div>
                </div>

                <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
                  <div class="text-[var(--text-muted)] text-ui-11">
                    {{ $t('workbench.settings.docking') }}
                  </div>
                  <div class="mt-0.5 text-base-text font-semibold text-ui-13">
                    Dockview Core
                  </div>
                </div>

                <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
                  <div class="text-[var(--text-muted)] text-ui-11">
                    {{ $t('workbench.settings.license') }}
                  </div>
                  <div class="mt-0.5 text-base-text font-semibold text-ui-13">
                    MIT License
                  </div>
                </div>
              </div>
            </div>

            <!-- 优势亮点 -->
            <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-4 text-[var(--text-muted)] leading-relaxed text-ui-12 space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-primary">✦</span>
                <span>{{ $t('workbench.settings.adv1') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-primary">✦</span>
                <span>{{ $t('workbench.settings.adv2') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-primary">✦</span>
                <span>{{ $t('workbench.settings.adv3') }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </NScrollbar>
    </main>
  </NModal>
</template>

<style scoped>
:global(.settings-modal) {
  container: settings / inline-size;
  width: min(760px, calc(94vw / var(--app-zoom, 1))) !important;
  height: min(650px, calc(90dvh / var(--app-zoom, 1))) !important;
  max-width: calc(94vw / var(--app-zoom, 1)) !important;
}

.settings-modes {
  width: max-content;
  flex-wrap: wrap;
  gap: 4px;
}

.settings-content :deep(.settings-row) {
  flex-wrap: wrap;
}

.settings-content :deep(.settings-row > div:first-child) {
  flex: 1 1 160px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.settings-content :deep(.settings-row > .n-select),
.settings-content :deep(.settings-row > .n-input-number),
.settings-content :deep(.settings-row > .n-radio-group) {
  flex-shrink: 0;
  max-width: 100%;
}

@container settings (max-width: 680px) {
  :global(.settings-modal > .n-card-content) {
    flex-direction: column;
  }

  .settings-nav {
    width: 100%;
    height: auto !important;
    padding-right: 48px;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .settings-nav nav {
    flex-direction: row;
  }

  .settings-content {
    height: 0;
  }

  .settings-content :deep(.n-scrollbar-content) {
    padding: 16px !important;
  }
}

/* 优雅平滑的切页位移动画 */
.content-slide-enter-active,
.content-slide-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.content-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.content-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
