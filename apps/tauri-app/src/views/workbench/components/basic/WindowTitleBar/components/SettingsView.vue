<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import { SvgIcon } from '@sa/components'
import {
  NButton,
  NModal,
  NRadioButton,
  NRadioGroup,
  NScrollbar,
  NSelect,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { $t } from '@/locales'
import { useAppStore } from '@/store/modules/app'
import { useWorkbenchThemeStore } from '@/store/modules/workbenchTheme'
import { PRESET_WORKBENCH_THEMES } from '@/theme/workbenchTheme'

defineOptions({
  name: 'SettingsView',
})

/** 弹窗显隐控制（双向绑定） */
const show = defineModel<boolean>('show', { default: false })

// ─── 1. Store 与基础状态 ───
const appStore = useAppStore()
const themeStore = useWorkbenchThemeStore()
const message = useMessage()

// ─── 2. 状态存储与初始化 ───
const STORAGE_KEY = 'dbx_workbench_settings_v2'

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
  theme: saved.theme || themeStore.currentThemeId || 'vscode-dark',
  themeMode: saved.themeMode || 'system',
  zoom: saved.zoom || '100%',
  interfaceFont: saved.interfaceFont || 'dbx-default',
  gridFont: saved.gridFont || 'Geist Variable Tabular',
  borderRadius: saved.borderRadius || 'small',
  layout: saved.layout || 'compact',
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

  // 1. 配色主题切换
  if (settings.theme in PRESET_WORKBENCH_THEMES) {
    themeStore.setTheme(settings.theme)
  }

  // 2. 主题模式联动（明亮 / 暗黑 / 跟随系统）
  const root = document.documentElement
  if (settings.themeMode === 'light') {
    root.classList.remove('dark')
    if (themeStore.currentThemeId !== 'vscode-light') {
      themeStore.setTheme('vscode-light')
    }
  }
  else if (settings.themeMode === 'dark') {
    root.classList.add('dark')
    if (themeStore.currentThemeId === 'vscode-light') {
      themeStore.setTheme(settings.theme === 'vscode-light' ? 'cursor' : settings.theme)
    }
  }
  else {
    const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    if (isDark) {
      root.classList.add('dark')
      if (themeStore.currentThemeId === 'vscode-light') {
        themeStore.setTheme(settings.theme)
      }
    }
    else {
      root.classList.remove('dark')
      themeStore.setTheme('vscode-light')
    }
  }

  // 3. 圆角变量
  const radiusMap: Record<string, string> = { none: '0px', small: '4px', large: '10px' }
  root.style.setProperty('--wb-border-radius', radiusMap[settings.borderRadius] || '4px')

  // 4. 界面字体
  const fontMap: Record<string, string> = {
    'system-default': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'Inter': 'Inter, system-ui, sans-serif',
  }
  if (fontMap[settings.interfaceFont]) {
    root.style.setProperty('--wb-interface-font', fontMap[settings.interfaceFont])
  }
  else {
    root.style.removeProperty('--wb-interface-font')
  }

  // 5. 缩放比例
  const zoomFactor = Number.parseInt(settings.zoom, 10) / 100
  if (!Number.isNaN(zoomFactor)) {
    root.style.setProperty('--wb-ui-zoom', String(zoomFactor))
  }
}

onMounted(() => {
  applyAppearanceEffects()
})

// ─── 3. UI 下拉选项数据源 ───
const languageOptions: SelectOption[] = [
  { label: '🇨🇳 简体中文', value: 'zh-CN' },
  { label: '🇺🇸 English', value: 'en-US' },
]

const themeOptions: SelectOption[] = [
  { label: 'Cursor', value: 'cursor' },
  { label: 'VS Code Dark', value: 'vscode-dark' },
  { label: 'VS Code Light', value: 'vscode-light' },
  { label: 'One Dark Pro', value: 'one-dark-pro' },
  { label: 'Industrial Blue', value: 'industrial-blue' },
]

/** 为配色主题选项渲染微型色标 */
function renderThemeLabel(option: SelectOption) {
  const colorMap: Record<string, string> = {
    'cursor': '#3b82f6',
    'vscode-dark': '#007acc',
    'vscode-light': '#007acc',
    'one-dark-pro': '#61afef',
    'industrial-blue': '#58a6ff',
  }
  const color = colorMap[String(option.value)] || 'var(--wb-accent-color)'
  return h('div', { class: 'flex items-center gap-2' }, [
    h('span', { class: 'size-2.5 rounded-full shrink-0 shadow-sm', style: { backgroundColor: color } }),
    h('span', null, String(option.label)),
  ])
}

const zoomOptions: SelectOption[] = [
  '80%',
  '90%',
  '100%',
  '110%',
  '120%',
  '130%',
  '150%',
].map(v => ({ label: v, value: v }))

const interfaceFontOptions: SelectOption[] = [
  { label: 'DBX Default', value: 'dbx-default' },
  { label: 'System Default', value: 'system-default' },
  { label: 'Inter, system-ui', value: 'Inter' },
  { label: 'PingFang SC, Microsoft YaHei', value: 'PingFang SC' },
  { label: 'Segoe UI, Roboto', value: 'Segoe UI' },
]

const gridFontOptions: SelectOption[] = [
  { label: 'Geist Variable Tabular', value: 'Geist Variable Tabular' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
  { label: 'Fira Code', value: 'Fira Code' },
  { label: 'Menlo, Monaco', value: 'Menlo, Monaco' },
  { label: 'Consolas', value: 'Consolas' },
  { label: 'SF Mono, monospace', value: 'SF Mono' },
]

// ─── 4. 侧边栏导航项 ───
type NavKey = 'appearance' | 'about'
const activeNav = ref<NavKey>('appearance')

const navTabs = computed(() => [
  {
    key: 'appearance' as NavKey,
    label: $t('workbench.settings.appearance'),
    icon: 'ri:palette-line',
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
    style="width: 760px; height: 530px; max-width: 94vw;"
    class="settings-modal shadow-[0_20px_50px_rgba(0,0,0,0.6)] !h-530px !max-w-[94vw] !w-760px !overflow-hidden !rounded-14px !bg-[#1c1c1f] !p-0"
    header-style="position: absolute; right: 12px; top: 12px; z-index: 50; padding: 0;"
    content-style="padding: 0; height: 100%; display: flex; overflow: hidden;"
    @close="show = false"
  >
    <!-- ─── 1. 左侧导航侧边栏 ─── -->
    <aside class="h-full w-180px flex flex-col shrink-0 select-none border-r border-white/6 bg-[#161618] p-3 pt-4">
      <nav class="flex flex-col gap-1.5">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          type="button"
          class="relative w-full flex cursor-pointer items-center gap-2.5 rounded-8px px-3 py-2 text-left text-13px font-medium transition-all duration-200"
          :class="[
            activeNav === tab.key
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
          ]"
          @click="activeNav = tab.key"
        >
          <!-- 选中指示竖条 -->
          <span
            v-if="activeNav === tab.key"
            class="absolute left-1 h-3.5 w-1 rounded-full bg-[var(--wb-accent-color,#007acc)]"
          />
          <SvgIcon :icon="tab.icon" class="text-15px" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- ─── 2. 右侧主体内容区 (固定高度，内置 NScrollbar 平滑滚动条) ─── -->
    <main class="relative h-full min-w-0 flex-1 overflow-hidden bg-[#1c1c1f]">
      <NScrollbar class="h-full" content-style="padding: 24px 32px 24px 24px;">
        <Transition name="content-slide" mode="out-in">
          <!-- ─── 视图 A: 外观设置 ─── -->
          <div v-if="activeNav === 'appearance'" key="appearance" class="space-y-6">
            <!-- 分组 1: 主题与视觉模式 -->
            <section class="space-y-3">
              <div class="text-11px text-zinc-500 font-semibold tracking-wider uppercase">
                {{ $t('workbench.settings.themeAndColor') }}
              </div>

              <div class="border border-white/5 rounded-10px bg-[#232326] p-3.5 space-y-2">
                <!-- 配色方案 -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.colorTheme') }}
                    </div>
                    <div class="text-11px text-zinc-500">
                      {{ $t('workbench.settings.colorThemeDesc') }}
                    </div>
                  </div>
                  <NSelect
                    v-model:value="settings.theme"
                    :options="themeOptions"
                    :render-label="renderThemeLabel"
                    size="small"
                    class="w-190px"
                    @update:value="applyAppearanceEffects"
                  />
                </div>

                <div class="h-[1px] w-full bg-white/5" />

                <!-- 主题模式 (Light / Dark / System) -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.appearanceMode') }}
                    </div>
                    <div class="text-11px text-zinc-500">
                      {{ $t('workbench.settings.appearanceModeDesc') }}
                    </div>
                  </div>
                  <NRadioGroup
                    v-model:value="settings.themeMode"
                    size="small"
                    class="w-210px flex"
                    @update:value="applyAppearanceEffects"
                  >
                    <NRadioButton value="light" class="flex-1 text-center text-12px">
                      <div class="flex items-center justify-center gap-1">
                        <SvgIcon icon="ri:sun-line" />
                        <span>{{ $t('workbench.settings.light') }}</span>
                      </div>
                    </NRadioButton>
                    <NRadioButton value="dark" class="flex-1 text-center text-12px">
                      <div class="flex items-center justify-center gap-1">
                        <SvgIcon icon="ri:moon-line" />
                        <span>{{ $t('workbench.settings.dark') }}</span>
                      </div>
                    </NRadioButton>
                    <NRadioButton value="system" class="flex-1 text-center text-12px">
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
              <div class="text-11px text-zinc-500 font-semibold tracking-wider uppercase">
                {{ $t('workbench.settings.displayAndTypography') }}
              </div>

              <div class="border border-white/5 rounded-10px bg-[#232326] p-3.5 space-y-2">
                <!-- 语言设置 -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.language') }}
                    </div>
                    <div class="text-11px text-zinc-500">
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

                <div class="h-[1px] w-full bg-white/5" />

                <!-- 界面缩放 -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.zoom') }}
                    </div>
                    <div class="text-11px text-zinc-500">
                      {{ $t('workbench.settings.zoomDesc') }}
                    </div>
                  </div>
                  <NSelect
                    v-model:value="settings.zoom"
                    :options="zoomOptions"
                    size="small"
                    class="w-190px"
                    @update:value="applyAppearanceEffects"
                  />
                </div>

                <div class="h-[1px] w-full bg-white/5" />

                <!-- 界面字体 -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.interfaceFont') }}
                    </div>
                    <div class="text-11px text-zinc-500">
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

                <div class="h-[1px] w-full bg-white/5" />

                <!-- 数据表格等宽字体 -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.monospacedFont') }}
                    </div>
                    <div class="text-11px text-zinc-500">
                      {{ $t('workbench.settings.monospacedFontDesc') }}
                    </div>
                  </div>
                  <NSelect
                    v-model:value="settings.gridFont"
                    :options="gridFontOptions"
                    size="small"
                    class="w-190px"
                    @update:value="persistSettings"
                  />
                </div>
              </div>
            </section>

            <!-- 分组 3: 布局与微风格 -->
            <section class="space-y-3">
              <div class="text-11px text-zinc-500 font-semibold tracking-wider uppercase">
                {{ $t('workbench.settings.frameAndLayout') }}
              </div>

              <div class="border border-white/5 rounded-10px bg-[#232326] p-3.5 space-y-2">
                <!-- 圆角风格 -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.borderRadius') }}
                    </div>
                    <div class="text-11px text-zinc-500">
                      {{ $t('workbench.settings.borderRadiusDesc') }}
                    </div>
                  </div>
                  <NRadioGroup
                    v-model:value="settings.borderRadius"
                    size="small"
                    class="w-210px flex"
                    @update:value="applyAppearanceEffects"
                  >
                    <NRadioButton value="none" class="flex-1 text-center text-12px">
                      {{ $t('workbench.settings.noneRadius') }}
                    </NRadioButton>
                    <NRadioButton value="small" class="flex-1 text-center text-12px">
                      {{ $t('workbench.settings.smallRadius') }}
                    </NRadioButton>
                    <NRadioButton value="large" class="flex-1 text-center text-12px">
                      {{ $t('workbench.settings.largeRadius') }}
                    </NRadioButton>
                  </NRadioGroup>
                </div>

                <div class="h-[1px] w-full bg-white/5" />

                <!-- 界面布局方案 -->
                <div class="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div class="text-13px text-zinc-200 font-medium">
                      {{ $t('workbench.settings.tabLayout') }}
                    </div>
                    <div class="text-11px text-zinc-500">
                      {{ $t('workbench.settings.tabLayoutDesc') }}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="rounded-6px border px-3 py-1.5 text-12px font-medium transition-all duration-150"
                      :class="[
                        settings.layout === 'modern'
                          ? 'border-[var(--wb-accent-color,#007acc)] bg-[var(--wb-accent-color,#007acc)]/15 text-white'
                          : 'border-white/5 bg-white/5 text-zinc-400 hover:text-white',
                      ]"
                      @click="settings.layout = 'modern'; persistSettings()"
                    >
                      {{ $t('workbench.settings.modern') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-6px border px-3 py-1.5 text-12px font-medium transition-all duration-150"
                      :class="[
                        settings.layout === 'compact'
                          ? 'border-[var(--wb-accent-color,#007acc)] bg-[var(--wb-accent-color,#007acc)]/15 text-white'
                          : 'border-white/5 bg-white/5 text-zinc-400 hover:text-white',
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

          <!-- ─── 视图 B: 关于我们 ─── -->
          <div v-else-if="activeNav === 'about'" key="about" class="space-y-5">
            <!-- 头部产品徽章卡片 -->
            <div class="relative overflow-hidden border border-white/6 rounded-12px bg-gradient-to-br from-[#27272a] to-[#1c1c1f] p-5">
              <div class="flex items-center gap-4">
                <div class="size-13 flex shrink-0 items-center justify-center rounded-12px bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/20 shadow-lg">
                  <SvgIcon icon="ri:macbook-line" class="text-26px text-white" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2.5">
                    <h3 class="text-16px text-white font-bold tracking-tight">
                      {{ $t('workbench.settings.aboutTitle') }}
                    </h3>
                    <NTag size="small" type="primary" round :bordered="false" class="font-mono text-11px">
                      v2.3.1
                    </NTag>
                  </div>
                  <p class="mt-1 text-12px text-zinc-400 leading-relaxed">
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
              <div class="text-11px text-zinc-500 font-semibold tracking-wider uppercase">
                {{ $t('workbench.settings.specifications') }}
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div class="border border-white/5 rounded-8px bg-[#232326] p-3">
                  <div class="text-11px text-zinc-500">
                    {{ $t('workbench.settings.engine') }}
                  </div>
                  <div class="mt-0.5 text-13px text-zinc-200 font-semibold">
                    Tauri 2.2 (Rust Core)
                  </div>
                </div>

                <div class="border border-white/5 rounded-8px bg-[#232326] p-3">
                  <div class="text-11px text-zinc-500">
                    {{ $t('workbench.settings.uiStack') }}
                  </div>
                  <div class="mt-0.5 text-13px text-zinc-200 font-semibold">
                    Vue 3.5 + Vite + TypeScript
                  </div>
                </div>

                <div class="border border-white/5 rounded-8px bg-[#232326] p-3">
                  <div class="text-11px text-zinc-500">
                    {{ $t('workbench.settings.docking') }}
                  </div>
                  <div class="mt-0.5 text-13px text-zinc-200 font-semibold">
                    Dockview Core
                  </div>
                </div>

                <div class="border border-white/5 rounded-8px bg-[#232326] p-3">
                  <div class="text-11px text-zinc-500">
                    {{ $t('workbench.settings.license') }}
                  </div>
                  <div class="mt-0.5 text-13px text-zinc-200 font-semibold">
                    MIT License
                  </div>
                </div>
              </div>
            </div>

            <!-- 优势亮点 -->
            <div class="border border-white/5 rounded-10px bg-[#232326] p-4 text-12px text-zinc-400 leading-relaxed space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-blue-400">✦</span>
                <span>{{ $t('workbench.settings.adv1') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-blue-400">✦</span>
                <span>{{ $t('workbench.settings.adv2') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-blue-400">✦</span>
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
