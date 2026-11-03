<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useAppStore } from '@/store/modules/app'
import { useWorkbenchThemeStore } from '@/store/modules/workbenchTheme'
import { useNaiveWorkbenchTheme } from '@/theme/naiveTheme'
import { PRESET_WORKBENCH_THEMES } from '@/theme/workbenchTheme'

defineOptions({
  name: 'SettingsEditor',
})

setupIconifyOffline()

const appStore = useAppStore()
const themeStore = useWorkbenchThemeStore()
const { activeTheme, themeOverrides } = useNaiveWorkbenchTheme()

// ─── 侧边栏分类定义 ───
interface SidebarNav {
  key: string
  label: string
}

const navList: SidebarNav[] = [
  { key: 'appearance', label: '外观' },
  { key: 'about', label: '关于我们' },
]

const activeNav = ref<string>('appearance')
const searchQuery = ref('')
const isSearchFocused = ref(false)

// 检查更新状态
const isCheckingUpdate = ref(false)

function handleCheckUpdate() {
  if (isCheckingUpdate.value)
    return
  isCheckingUpdate.value = true
  setTimeout(() => {
    isCheckingUpdate.value = false
    window.$message?.success?.('当前已是最新版本 (v2.3.1)')
  }, 1200)
}

// ─── 下拉选项定义 ───
interface DropdownOption {
  label: string
  value: string
  iconColor?: string
}

const languageOptions: DropdownOption[] = [
  { label: '🇨🇳 简体中文', value: 'zh-CN' },
  { label: '🇺🇸 English', value: 'en-US' },
  { label: '🇯🇵 日本語', value: 'ja-JP' },
  { label: '🇹🇼 繁體中文', value: 'zh-TW' },
]

const themeOptions: DropdownOption[] = [
  { label: 'Cursor', value: 'cursor', iconColor: '#3880ff' },
  { label: 'VS Code Dark', value: 'vscode-dark', iconColor: '#007acc' },
  { label: 'VS Code Light', value: 'vscode-light', iconColor: '#e0e0e0' },
  { label: 'One Dark Pro', value: 'one-dark-pro', iconColor: '#61afef' },
  { label: 'Industrial Blue', value: 'industrial-blue', iconColor: '#58a6ff' },
]

const zoomOptions: DropdownOption[] = [
  { label: '80%', value: '80%' },
  { label: '90%', value: '90%' },
  { label: '100%', value: '100%' },
  { label: '110%', value: '110%' },
  { label: '120%', value: '120%' },
  { label: '130%', value: '130%' },
  { label: '150%', value: '150%' },
]

const interfaceFontOptions: DropdownOption[] = [
  { label: 'DBX 默认', value: 'dbx-default' },
  { label: '系统默认 (System Default)', value: 'system-default' },
  { label: 'Inter, system-ui', value: 'Inter' },
  { label: 'PingFang SC, Microsoft YaHei', value: 'PingFang SC' },
  { label: 'Segoe UI, Roboto', value: 'Segoe UI' },
]

const gridFontOptions: DropdownOption[] = [
  { label: 'Geist Variable Tabular', value: 'Geist Variable Tabular' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
  { label: 'Fira Code', value: 'Fira Code' },
  { label: 'Menlo, Monaco', value: 'Menlo, Monaco' },
  { label: 'Consolas', value: 'Consolas' },
  { label: 'SF Mono, monospace', value: 'SF Mono' },
]

// ─── 状态持久化 ───
const STORAGE_KEY = 'dbx_workbench_settings_v2'

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  }
  catch {
    return {}
  }
}

const saved = loadSavedSettings()

const selectedLanguage = ref<string>(saved.language || 'zh-CN')
const selectedTheme = ref<string>(saved.theme || 'cursor')
const selectedZoom = ref<string>(saved.zoom || '100%')
const selectedInterfaceFont = ref<string>(saved.interfaceFont || 'dbx-default')
const selectedGridFont = ref<string>(saved.gridFont || 'Geist Variable Tabular')
const selectedThemeMode = ref<'light' | 'dark' | 'system'>(saved.themeMode || 'system')
const selectedBorderRadius = ref<'none' | 'small' | 'large'>(saved.borderRadius || 'small')
const selectedLayout = ref<'modern' | 'compact'>(saved.layout || 'compact')

// 下拉弹窗展开管理
const openDropdown = ref<string | null>(null)

function toggleDropdown(key: string, event?: Event) {
  event?.stopPropagation()
  openDropdown.value = openDropdown.value === key ? null : key
}

function closeAllDropdowns() {
  openDropdown.value = null
}

function persistSettings() {
  try {
    const data = {
      language: selectedLanguage.value,
      theme: selectedTheme.value,
      zoom: selectedZoom.value,
      interfaceFont: selectedInterfaceFont.value,
      gridFont: selectedGridFont.value,
      themeMode: selectedThemeMode.value,
      borderRadius: selectedBorderRadius.value,
      layout: selectedLayout.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
  catch {
    // ignore
  }
}

// 联动底层全局状态与 CSS 变量
function applyAppearanceEffects() {
  // 1. 配色主题切换
  if (selectedTheme.value in PRESET_WORKBENCH_THEMES) {
    themeStore.setTheme(selectedTheme.value)
  }

  // 2. 主题模式联动
  const root = document.documentElement
  if (selectedThemeMode.value === 'light') {
    root.classList.remove('dark')
    if (themeStore.currentThemeId !== 'vscode-light') {
      themeStore.setTheme('vscode-light')
    }
  }
  else if (selectedThemeMode.value === 'dark') {
    root.classList.add('dark')
    if (themeStore.currentThemeId === 'vscode-light') {
      themeStore.setTheme(selectedTheme.value === 'vscode-light' ? 'cursor' : selectedTheme.value)
    }
  }
  else {
    // 跟随系统
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) {
      root.classList.add('dark')
      if (themeStore.currentThemeId === 'vscode-light') {
        themeStore.setTheme(selectedTheme.value)
      }
    }
    else {
      root.classList.remove('dark')
      themeStore.setTheme('vscode-light')
    }
  }

  // 3. 圆角变量
  const radiusMap: Record<string, string> = {
    none: '0px',
    small: '4px',
    large: '10px',
  }
  root.style.setProperty('--wb-border-radius', radiusMap[selectedBorderRadius.value] || '4px')

  // 4. 界面字体
  if (selectedInterfaceFont.value === 'system-default') {
    root.style.setProperty('--wb-interface-font', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif')
  }
  else if (selectedInterfaceFont.value === 'Inter') {
    root.style.setProperty('--wb-interface-font', 'Inter, system-ui, sans-serif')
  }
  else {
    root.style.removeProperty('--wb-interface-font')
  }

  // 5. 缩放
  const zoomFactor = Number.parseInt(selectedZoom.value, 10) / 100
  if (!Number.isNaN(zoomFactor)) {
    root.style.setProperty('--wb-ui-zoom', String(zoomFactor))
  }
}

// 选择项更新
function selectLanguage(val: string) {
  selectedLanguage.value = val
  closeAllDropdowns()
  persistSettings()
  if (val === 'zh-CN' || val === 'en-US') {
    appStore.changeLocale(val as any)
  }
}

function selectTheme(val: string) {
  selectedTheme.value = val
  closeAllDropdowns()
  persistSettings()
  applyAppearanceEffects()
}

function selectZoom(val: string) {
  selectedZoom.value = val
  closeAllDropdowns()
  persistSettings()
  applyAppearanceEffects()
}

function selectInterfaceFont(val: string) {
  selectedInterfaceFont.value = val
  closeAllDropdowns()
  persistSettings()
  applyAppearanceEffects()
}

function selectGridFont(val: string) {
  selectedGridFont.value = val
  closeAllDropdowns()
  persistSettings()
}

function selectThemeMode(mode: 'light' | 'dark' | 'system') {
  selectedThemeMode.value = mode
  persistSettings()
  applyAppearanceEffects()
}

function selectBorderRadius(radius: 'none' | 'small' | 'large') {
  selectedBorderRadius.value = radius
  persistSettings()
  applyAppearanceEffects()
}

function selectLayout(layout: 'modern' | 'compact') {
  selectedLayout.value = layout
  persistSettings()
}

// 辅助查找展示标签
function getLanguageLabel(val: string) {
  return languageOptions.find(o => o.value === val)?.label || val
}
function getThemeItem(val: string) {
  return themeOptions.find(o => o.value === val) || { label: val, value: val, iconColor: '#3880ff' }
}
function getInterfaceFontLabel(val: string) {
  return interfaceFontOptions.find(o => o.value === val)?.label || val
}
function getGridFontLabel(val: string) {
  return gridFontOptions.find(o => o.value === val)?.label || val
}

// 全局点击自动关闭下拉层
function handleDocumentClick() {
  closeAllDropdowns()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  applyAppearanceEffects()
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

// ─── 全局设置搜索过滤 ───
interface SearchableSetting {
  id: string
  navKey: string
  categoryName: string
  title: string
  description: string
}

const allSettingsList = computed<SearchableSetting[]>(() => [
  { id: 'app.language', navKey: 'appearance', categoryName: '外观', title: '语言 / Language', description: '配置软件显示的主要语言，包括中文、英文等' },
  { id: 'app.theme', navKey: 'appearance', categoryName: '外观', title: '配色主题', description: '设置编辑器与界面配色，如 Cursor、VS Code Dark、Industrial Blue' },
  { id: 'app.zoom', navKey: 'appearance', categoryName: '外观', title: '界面缩放', description: '调整工作台界面的缩放比例' },
  { id: 'app.font', navKey: 'appearance', categoryName: '外观', title: '界面字体', description: '工作台控件与侧栏的默认字体' },
  { id: 'app.gridFont', navKey: 'appearance', categoryName: '外观', title: '查询结果网格字体', description: '表格和查询结果等宽字体' },
  { id: 'app.themeMode', navKey: 'appearance', categoryName: '外观', title: '主题模式', description: '切换亮色、暗色或跟随系统外观' },
  { id: 'app.borderRadius', navKey: 'appearance', categoryName: '外观', title: '圆角样式', description: '无圆角、小圆角或大圆角' },
  { id: 'app.layout', navKey: 'appearance', categoryName: '外观', title: '界面布局', description: '现代分隔与经典紧凑布局' },
  { id: 'app.about', navKey: 'about', categoryName: '关于我们', title: '关于我们 (About Us)', description: '查看产品介绍、技术栈与更新历史' },
  { id: 'app.version', navKey: 'about', categoryName: '关于我们', title: '版本检查 (Version & Update)', description: '当前客户端版本 v2.3.1 与在线检查更新' },
])

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return []
  return allSettingsList.value.filter(s =>
    s.title.toLowerCase().includes(q)
    || s.description.toLowerCase().includes(q)
    || s.categoryName.toLowerCase().includes(q),
  )
})

function handleSelectSearchResult(item: SearchableSetting) {
  activeNav.value = item.navKey
  searchQuery.value = ''
}
</script>

<template>
  <NConfigProvider :theme="activeTheme" :theme-overrides="themeOverrides" class="size-full">
    <div
      class="size-full flex select-none overflow-hidden text-13px font-sans"
      style="background-color: #0b0f17; color: #cbd5e1;"
      @click="closeAllDropdowns"
    >
      <!-- ─── 左侧侧边栏导航 ─── -->
      <aside
        class="w-180px flex flex-col shrink-0 py-4 pl-5 pr-3"
        style="background-color: #0b0f17;"
      >
        <!-- 顶部标题：设置 -->
        <div class="mb-4 flex items-center gap-2 pl-2">
          <!-- 齿轮图标 -->
          <svg class="size-4.5 text-[#e2e8f0]" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="m8.94 1.5-1.88.02-.32 1.43a5.52 5.52 0 0 0-1.28.53l-1.3-.67-1.33 1.33.67 1.3a5.52 5.52 0 0 0-.53 1.28l-1.43.32-.02 1.88 1.43.32c.13.45.31.88.53 1.28l-.67 1.3 1.33 1.33 1.3-.67c.4.22.83.4 1.28.53l.32 1.43 1.88.02.32-1.43c.45-.13.88-.31 1.28-.53l1.3.67 1.33-1.33-.67-1.3c.22-.4.4-.83.53-1.28l1.43-.32.02-1.88-1.43-.32a5.52 5.52 0 0 0-.53-1.28l.67-1.3-1.33-1.33-1.3.67a5.52 5.52 0 0 0-1.28-.53l-.32-1.43ZM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" clip-rule="evenodd" />
          </svg>
          <span class="text-15px text-[#f1f5f9] font-semibold tracking-wide">设置</span>
        </div>

        <!-- 菜单列表（仅保留外观） -->
        <nav class="flex-1 overflow-y-auto pr-1 space-y-0.5">
          <button
            v-for="item in navList"
            :key="item.key"
            type="button"
            class="w-full flex cursor-pointer items-center rounded-md px-3.5 py-1.8 text-left text-13px transition-colors duration-150"
            :class="[
              activeNav === item.key && !searchQuery
                ? 'bg-[#4d88ff] font-medium text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-white/[0.04] hover:text-[#e2e8f0]',
            ]"
            @click="activeNav = item.key; searchQuery = ''"
          >
            <span>{{ item.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- ─── 右侧内容主区域 ─── -->
      <main class="min-w-0 flex flex-col flex-1 overflow-y-auto px-8 pb-12 pt-4">
        <!-- 顶部搜索栏 -->
        <div class="mb-6 w-full shrink-0">
          <div
            class="relative h-9 flex items-center border rounded-md transition-all"
            :style="{
              backgroundColor: '#121722',
              borderColor: isSearchFocused ? '#3880ff' : '#222b3d',
            }"
          >
            <!-- 放大镜图标 -->
            <svg
              class="ml-3 size-4 shrink-0 text-[#64748b]"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <circle cx="7" cy="7" r="5" />
              <path stroke-linecap="round" d="m11 11 3.5 3.5" />
            </svg>

            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索设置"
              class="h-full min-w-0 flex-1 bg-transparent px-2.5 text-13px text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
              @focus="isSearchFocused = true"
              @blur="isSearchFocused = false"
            >

            <!-- 清除搜索输入 -->
            <button
              v-if="searchQuery"
              type="button"
              class="mr-2 size-5 flex cursor-pointer items-center justify-center rounded text-[#858585] hover:bg-white/10 hover:text-white"
              title="清除搜索"
              @click="searchQuery = ''"
            >
              <svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708Z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 搜索结果展示 -->
        <div v-if="searchQuery.trim()" class="space-y-2">
          <div class="mb-3 text-12px text-[#858585]">
            搜索“{{ searchQuery }}”的匹配结果 ({{ searchResults.length }})
          </div>

          <div
            v-if="searchResults.length === 0"
            class="py-12 text-center text-13px text-[#64748b]"
          >
            未找到匹配的设置项
          </div>

          <div
            v-for="item in searchResults"
            :key="item.id"
            class="flex cursor-pointer items-center justify-between border border-[#222b3d] rounded-md bg-[#121722] p-3 transition-colors hover:border-[#3880ff] hover:bg-[#151c2b]"
            @click="handleSelectSearchResult(item)"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="rounded bg-[#3880ff]/15 px-1.5 py-0.5 text-11px text-[#60a5fa] font-medium">
                  {{ item.categoryName }}
                </span>
                <span class="text-[#e2e8f0] font-medium">{{ item.title }}</span>
              </div>
              <p class="mt-1 text-12px text-[#858585]">
                {{ item.description }}
              </p>
            </div>
            <span class="text-12px text-[#3880ff]">前往配置 →</span>
          </div>
        </div>

        <!-- ─── 分类内容：外观 (严格还原截图设计) ─── -->
        <div v-else-if="activeNav === 'appearance'" class="space-y-6">
          <!-- 第一行：3列网格 (语言 / Language | 配色主题 | 界面缩放 🛈) -->
          <div class="grid grid-cols-3 gap-5">
            <!-- 语言 / Language -->
            <div>
              <label class="mb-2 block text-13px text-[#e2e8f0] font-medium">
                语言 / Language
              </label>
              <div class="relative">
                <button
                  type="button"
                  class="h-9 w-full flex cursor-pointer items-center justify-between border rounded-md px-3 text-13px text-[#cbd5e1] transition-colors focus:border-[#3880ff]"
                  style="background-color: #121722; border-color: #222b3d;"
                  @click="toggleDropdown('language', $event)"
                >
                  <span class="truncate">{{ getLanguageLabel(selectedLanguage) }}</span>
                  <svg class="size-4 shrink-0 text-[#858585]" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>

                <!-- 下拉浮层 -->
                <div
                  v-if="openDropdown === 'language'"
                  class="absolute left-0 top-10.5 z-40 w-full overflow-hidden border rounded-md py-1 shadow-2xl"
                  style="background-color: #151c2a; border-color: #263246;"
                  @click.stop
                >
                  <button
                    v-for="opt in languageOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full flex cursor-pointer items-center justify-between px-3 py-2 text-left text-13px transition-colors hover:bg-[#202b3d]"
                    :class="[selectedLanguage === opt.value ? 'text-[#60a5fa] font-medium' : 'text-[#cbd5e1]']"
                    @click="selectLanguage(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                    <span v-if="selectedLanguage === opt.value" class="text-xs">✓</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 配色主题 (含色点指示器) -->
            <div>
              <label class="mb-2 block text-13px text-[#e2e8f0] font-medium">
                配色主题
              </label>
              <div class="relative">
                <button
                  type="button"
                  class="h-9 w-full flex cursor-pointer items-center justify-between border rounded-md px-3 text-13px text-[#cbd5e1] transition-colors focus:border-[#3880ff]"
                  style="background-color: #121722; border-color: #222b3d;"
                  @click="toggleDropdown('theme', $event)"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span
                      class="size-2.5 shrink-0 rounded-full"
                      :style="{ backgroundColor: getThemeItem(selectedTheme).iconColor || '#3880ff' }"
                    />
                    <span>{{ getThemeItem(selectedTheme).label }}</span>
                  </div>
                  <svg class="size-4 shrink-0 text-[#858585]" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>

                <!-- 下拉浮层 -->
                <div
                  v-if="openDropdown === 'theme'"
                  class="absolute left-0 top-10.5 z-40 w-full overflow-hidden border rounded-md py-1 shadow-2xl"
                  style="background-color: #151c2a; border-color: #263246;"
                  @click.stop
                >
                  <button
                    v-for="opt in themeOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full flex cursor-pointer items-center justify-between px-3 py-2 text-left text-13px transition-colors hover:bg-[#202b3d]"
                    :class="[selectedTheme === opt.value ? 'text-[#60a5fa] font-medium' : 'text-[#cbd5e1]']"
                    @click="selectTheme(opt.value)"
                  >
                    <div class="flex items-center gap-2">
                      <span class="size-2.5 rounded-full" :style="{ backgroundColor: opt.iconColor }" />
                      <span>{{ opt.label }}</span>
                    </div>
                    <span v-if="selectedTheme === opt.value" class="text-xs">✓</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 界面缩放 🛈 -->
            <div>
              <div class="mb-2 flex items-center gap-1.5">
                <label class="text-13px text-[#e2e8f0] font-medium">界面缩放</label>
                <!-- 提示圆圈图标 -->
                <NTooltip trigger="hover">
                  <template #trigger>
                    <span class="cursor-pointer text-[#717d91] hover:text-[#94a3b8]">
                      <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
                        <circle cx="8" cy="8" r="7" />
                        <path stroke-linecap="round" d="M8 7v4M8 5h.01" />
                      </svg>
                    </span>
                  </template>
                  调整工作台桌面窗口的整体 UI 渲染比例与文字缩放
                </NTooltip>
              </div>

              <div class="relative">
                <button
                  type="button"
                  class="h-9 w-full flex cursor-pointer items-center justify-between border rounded-md px-3 text-13px text-[#cbd5e1] transition-colors focus:border-[#3880ff]"
                  style="background-color: #121722; border-color: #222b3d;"
                  @click="toggleDropdown('zoom', $event)"
                >
                  <span>{{ selectedZoom }}</span>
                  <svg class="size-4 shrink-0 text-[#858585]" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>

                <!-- 下拉浮层 -->
                <div
                  v-if="openDropdown === 'zoom'"
                  class="absolute left-0 top-10.5 z-40 w-full overflow-hidden border rounded-md py-1 shadow-2xl"
                  style="background-color: #151c2a; border-color: #263246;"
                  @click.stop
                >
                  <button
                    v-for="opt in zoomOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full flex cursor-pointer items-center justify-between px-3 py-2 text-left text-13px transition-colors hover:bg-[#202b3d]"
                    :class="[selectedZoom === opt.value ? 'text-[#60a5fa] font-medium' : 'text-[#cbd5e1]']"
                    @click="selectZoom(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                    <span v-if="selectedZoom === opt.value" class="text-xs">✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 第二行：2列网格 (界面字体 🛈 | 查询结果网格字体 🛈) -->
          <div class="grid grid-cols-2 gap-5">
            <!-- 界面字体 -->
            <div>
              <div class="mb-2 flex items-center gap-1.5">
                <label class="text-13px text-[#e2e8f0] font-medium">界面字体</label>
                <NTooltip trigger="hover">
                  <template #trigger>
                    <span class="cursor-pointer text-[#717d91] hover:text-[#94a3b8]">
                      <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
                        <circle cx="8" cy="8" r="7" />
                        <path stroke-linecap="round" d="M8 7v4M8 5h.01" />
                      </svg>
                    </span>
                  </template>
                  配置工作台界面、侧边栏及菜单展示的首选主字体
                </NTooltip>
              </div>

              <div class="relative">
                <button
                  type="button"
                  class="h-9 w-full flex cursor-pointer items-center justify-between border rounded-md px-3 text-13px text-[#cbd5e1] transition-colors focus:border-[#3880ff]"
                  style="background-color: #121722; border-color: #222b3d;"
                  @click="toggleDropdown('interfaceFont', $event)"
                >
                  <span class="truncate">{{ getInterfaceFontLabel(selectedInterfaceFont) }}</span>
                  <svg class="size-4 shrink-0 text-[#858585]" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>

                <div
                  v-if="openDropdown === 'interfaceFont'"
                  class="absolute left-0 top-10.5 z-40 w-full overflow-hidden border rounded-md py-1 shadow-2xl"
                  style="background-color: #151c2a; border-color: #263246;"
                  @click.stop
                >
                  <button
                    v-for="opt in interfaceFontOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full flex cursor-pointer items-center justify-between px-3 py-2 text-left text-13px transition-colors hover:bg-[#202b3d]"
                    :class="[selectedInterfaceFont === opt.value ? 'text-[#60a5fa] font-medium' : 'text-[#cbd5e1]']"
                    @click="selectInterfaceFont(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                    <span v-if="selectedInterfaceFont === opt.value" class="text-xs">✓</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 查询结果网格字体 -->
            <div>
              <div class="mb-2 flex items-center gap-1.5">
                <label class="text-13px text-[#e2e8f0] font-medium">查询结果网格字体</label>
                <NTooltip trigger="hover">
                  <template #trigger>
                    <span class="cursor-pointer text-[#717d91] hover:text-[#94a3b8]">
                      <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
                        <circle cx="8" cy="8" r="7" />
                        <path stroke-linecap="round" d="M8 7v4M8 5h.01" />
                      </svg>
                    </span>
                  </template>
                  配置数据表结果集与网格视图采用的等宽数字对齐字体
                </NTooltip>
              </div>

              <div class="relative">
                <button
                  type="button"
                  class="h-9 w-full flex cursor-pointer items-center justify-between border rounded-md px-3 text-13px text-[#cbd5e1] transition-colors focus:border-[#3880ff]"
                  style="background-color: #121722; border-color: #222b3d;"
                  @click="toggleDropdown('gridFont', $event)"
                >
                  <span class="truncate">{{ getGridFontLabel(selectedGridFont) }}</span>
                  <svg class="size-4 shrink-0 text-[#858585]" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>

                <div
                  v-if="openDropdown === 'gridFont'"
                  class="absolute left-0 top-10.5 z-40 w-full overflow-hidden border rounded-md py-1 shadow-2xl"
                  style="background-color: #151c2a; border-color: #263246;"
                  @click.stop
                >
                  <button
                    v-for="opt in gridFontOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full flex cursor-pointer items-center justify-between px-3 py-2 text-left text-13px transition-colors hover:bg-[#202b3d]"
                    :class="[selectedGridFont === opt.value ? 'text-[#60a5fa] font-medium' : 'text-[#cbd5e1]']"
                    @click="selectGridFont(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                    <span v-if="selectedGridFont === opt.value" class="text-xs">✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 第三行：2列网格 (主题：亮色 / 暗色 / 跟随系统 | 圆角样式：无圆角 / 小圆角 / 大圆角) -->
          <div class="grid grid-cols-2 gap-5">
            <!-- 主题分段切换 -->
            <div>
              <label class="mb-2 block text-13px text-[#e2e8f0] font-medium">
                主题
              </label>
              <div class="flex items-center gap-2">
                <!-- 亮色 -->
                <button
                  type="button"
                  class="h-9 flex flex-1 cursor-pointer items-center justify-center gap-1.5 border rounded-md px-3 text-13px transition-all"
                  :style="selectedThemeMode === 'light'
                    ? { backgroundColor: '#162338', borderColor: '#2b5288', color: '#60a5fa' }
                    : { backgroundColor: '#121722', borderColor: '#222b3d', color: '#94a3b8' }"
                  @click="selectThemeMode('light')"
                >
                  <!-- 太阳图标 -->
                  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>亮色</span>
                </button>

                <!-- 暗色 -->
                <button
                  type="button"
                  class="h-9 flex flex-1 cursor-pointer items-center justify-center gap-1.5 border rounded-md px-3 text-13px transition-all"
                  :style="selectedThemeMode === 'dark'
                    ? { backgroundColor: '#162338', borderColor: '#2b5288', color: '#60a5fa' }
                    : { backgroundColor: '#121722', borderColor: '#222b3d', color: '#94a3b8' }"
                  @click="selectThemeMode('dark')"
                >
                  <!-- 月亮图标 -->
                  <svg class="size-3.8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>暗色</span>
                </button>

                <!-- 跟随系统 -->
                <button
                  type="button"
                  class="h-9 flex flex-1 cursor-pointer items-center justify-center gap-1.5 border rounded-md px-3 text-13px transition-all"
                  :style="selectedThemeMode === 'system'
                    ? { backgroundColor: '#162338', borderColor: '#2b5288', color: '#60a5fa' }
                    : { backgroundColor: '#121722', borderColor: '#222b3d', color: '#94a3b8' }"
                  @click="selectThemeMode('system')"
                >
                  <!-- 自动 / 星光魔棒图标 -->
                  <svg class="size-3.8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
                  </svg>
                  <span>跟随系统</span>
                </button>
              </div>
            </div>

            <!-- 圆角样式分段切换 -->
            <div>
              <label class="mb-2 block text-13px text-[#e2e8f0] font-medium">
                圆角样式
              </label>
              <div class="flex items-center gap-2">
                <!-- 无圆角 -->
                <button
                  type="button"
                  class="h-9 flex flex-1 cursor-pointer items-center justify-center border rounded-md px-3 text-13px transition-all"
                  :style="selectedBorderRadius === 'none'
                    ? { backgroundColor: '#162338', borderColor: '#2b5288', color: '#60a5fa' }
                    : { backgroundColor: '#121722', borderColor: '#222b3d', color: '#94a3b8' }"
                  @click="selectBorderRadius('none')"
                >
                  无圆角
                </button>

                <!-- 小圆角 (选中状态) -->
                <button
                  type="button"
                  class="h-9 flex flex-1 cursor-pointer items-center justify-center border rounded-md px-3 text-13px transition-all"
                  :style="selectedBorderRadius === 'small'
                    ? { backgroundColor: '#162338', borderColor: '#2b5288', color: '#60a5fa' }
                    : { backgroundColor: '#121722', borderColor: '#222b3d', color: '#94a3b8' }"
                  @click="selectBorderRadius('small')"
                >
                  小圆角
                </button>

                <!-- 大圆角 -->
                <button
                  type="button"
                  class="h-9 flex flex-1 cursor-pointer items-center justify-center border rounded-md px-3 text-13px transition-all"
                  :style="selectedBorderRadius === 'large'
                    ? { backgroundColor: '#162338', borderColor: '#2b5288', color: '#60a5fa' }
                    : { backgroundColor: '#121722', borderColor: '#222b3d', color: '#94a3b8' }"
                  @click="selectBorderRadius('large')"
                >
                  大圆角
                </button>
              </div>
            </div>
          </div>

          <!-- 第四行：界面布局 (双卡片选择器：现代分隔 | 经典紧凑) -->
          <div>
            <label class="mb-2.5 block text-13px text-[#e2e8f0] font-medium">
              界面布局
            </label>
            <div class="grid grid-cols-2 gap-5">
              <!-- 卡片 1：现代分隔 -->
              <div
                class="cursor-pointer border rounded-md p-4 transition-all"
                :style="selectedLayout === 'modern'
                  ? { backgroundColor: '#131b29', borderColor: '#2b5288' }
                  : { backgroundColor: '#121722', borderColor: '#222b3d' }"
                @click="selectLayout('modern')"
              >
                <div
                  class="text-14px font-medium tracking-tight"
                  :class="[selectedLayout === 'modern' ? 'text-[#60a5fa]' : 'text-white']"
                >
                  现代分隔
                </div>
                <div class="mt-1.5 text-12px text-[#7e8b9f] leading-relaxed">
                  面板分隔更清晰，标签页为块状样式。
                </div>
              </div>

              <!-- 卡片 2：经典紧凑 (选中状态) -->
              <div
                class="cursor-pointer border rounded-md p-4 transition-all"
                :style="selectedLayout === 'compact'
                  ? { backgroundColor: '#131b29', borderColor: '#2b5288' }
                  : { backgroundColor: '#121722', borderColor: '#222b3d' }"
                @click="selectLayout('compact')"
              >
                <div
                  class="text-14px font-medium tracking-tight"
                  :class="[selectedLayout === 'compact' ? 'text-[#60a5fa]' : 'text-white']"
                >
                  经典紧凑
                </div>
                <div class="mt-1.5 text-12px text-[#7e8b9f] leading-relaxed">
                  使用连续标签栏和更紧凑的面板标题。
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── 分类内容：关于我们 ─── -->
        <div v-else-if="activeNav === 'about'" class="max-w-720px space-y-6">
          <!-- 头部品牌卡片 -->
          <div
            class="relative overflow-hidden border rounded-lg p-6"
            style="background: linear-gradient(135deg, #131b2b 0%, #0e1420 100%); border-color: #222d42;"
          >
            <!-- 装饰背景微光 -->
            <div
              class="pointer-events-none absolute size-48 rounded-full blur-3xl -right-16 -top-16"
              style="background: radial-gradient(circle, rgba(56, 128, 255, 0.15) 0%, transparent 70%);"
            />

            <div class="flex items-start gap-4">
              <!-- 应用图标 -->
              <div
                class="size-16 flex shrink-0 items-center justify-center border border-white/10 rounded-xl shadow-lg"
                style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);"
              >
                <svg class="size-8.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>

              <!-- 应用标题与版本 -->
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2.5">
                  <h2 class="text-18px text-white font-bold tracking-tight">
                    Soybean Desktop
                  </h2>
                  <span class="border border-[#3880ff]/30 rounded bg-[#3880ff]/20 px-2 py-0.5 text-11px text-[#60a5fa] font-semibold">
                    v2.3.1 (Stable)
                  </span>
                </div>
                <p class="mt-1.5 text-13px text-[#94a3b8] leading-relaxed">
                  基于 Tauri v2 与 Vue 3 构建的现代化跨平台桌面测试与分析工作台。
                </p>

                <!-- 操作按钮组 -->
                <div class="mt-4 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    class="h-8 flex cursor-pointer items-center gap-1.5 rounded-md bg-[#3880ff] px-3.5 text-12px text-white font-medium transition-colors hover:bg-[#2b6ee0] disabled:opacity-60"
                    :disabled="isCheckingUpdate"
                    @click="handleCheckUpdate"
                  >
                    <svg
                      class="size-3.5"
                      :class="{ 'animate-spin': isCheckingUpdate }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>{{ isCheckingUpdate ? '正在检查...' : '检查更新' }}</span>
                  </button>

                  <a
                    href="https://github.com/soybeanjs/soybean-admin"
                    target="_blank"
                    rel="noreferrer"
                    class="h-8 flex cursor-pointer items-center gap-1.5 border border-[#263246] rounded-md bg-[#121722] px-3.5 text-12px text-[#cbd5e1] font-medium transition-colors hover:border-[#3880ff] hover:text-white"
                  >
                    <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                    </svg>
                    <span>开源仓库</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- 环境规格与技术栈 -->
          <div>
            <h3 class="mb-3 text-13px text-[#e2e8f0] font-medium">
              环境与技术架构
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="border border-[#222b3d] rounded-md bg-[#121722] p-3.5">
                <span class="text-11px text-[#717d91]">运行时与核心</span>
                <div class="mt-1 text-13px text-[#e2e8f0] font-medium">
                  Tauri 2.2.0 (Rust Engine)
                </div>
              </div>

              <div class="border border-[#222b3d] rounded-md bg-[#121722] p-3.5">
                <span class="text-11px text-[#717d91]">前端框架体系</span>
                <div class="mt-1 text-13px text-[#e2e8f0] font-medium">
                  Vue 3.5 + Vite + TypeScript
                </div>
              </div>

              <div class="border border-[#222b3d] rounded-md bg-[#121722] p-3.5">
                <span class="text-11px text-[#717d91]">工作区分屏系统</span>
                <div class="mt-1 text-13px text-[#e2e8f0] font-medium">
                  Dockview Core Engine
                </div>
              </div>

              <div class="border border-[#222b3d] rounded-md bg-[#121722] p-3.5">
                <span class="text-11px text-[#717d91]">开源授权协议</span>
                <div class="mt-1 text-13px text-[#e2e8f0] font-medium">
                  MIT Open Source License
                </div>
              </div>
            </div>
          </div>

          <!-- 核心特性卡片 -->
          <div class="border border-[#222b3d] rounded-md bg-[#121722] p-4.5">
            <h3 class="mb-2 text-13px text-[#e2e8f0] font-medium">
              产品核心优势
            </h3>
            <ul class="text-12px text-[#94a3b8] leading-relaxed space-y-2">
              <li class="flex items-center gap-2">
                <span class="text-[#3880ff]">✦</span>
                <span>毫秒级冷启动与超低系统内存占用，原生 Rust 底层保障</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-[#3880ff]">✦</span>
                <span>自由拖拽的多向工作区分屏与现代深色主题自定义机制</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-[#3880ff]">✦</span>
                <span>本地安全存储与高度隔离的测试环境连接通信通道</span>
              </li>
            </ul>
          </div>

          <!-- 底部版权信息 -->
          <div class="pt-2 text-center text-12px text-[#64748b]">
            Copyright © 2026 Soybean Desktop Team. All rights reserved.
          </div>
        </div>
      </main>
    </div>
  </NConfigProvider>
</template>

<style scoped>
/* 滚动条细致暗黑风格 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
