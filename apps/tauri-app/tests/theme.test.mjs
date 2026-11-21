/* eslint-disable test/no-import-node-test -- 本应用未安装 Vitest，使用 Node 内置测试运行器。 */
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, beforeEach, it } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

// 使用现有 Vite 的编译依赖，测试真实主题计算与同步，仅替换平台存储/DOM 边界。
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild')
const { NConfigProvider, NInput, NInputNumber, NSelect, NDatePicker, NTimePicker, NCascader, NTreeSelect, darkTheme, lightTheme } = require('naive-ui')
const { createSSRApp, h } = require('vue')
const { renderToString } = require('vue/server-renderer')

const { setup: setupSsr } = createRequire(require.resolve('naive-ui'))('@css-render/vue3-ssr')

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(path.join(tmpdir(), 'tauri-theme-test-'))
after(() => rm(temporary, { recursive: true, force: true }))
const mocks = {
  '@/utils/storage': `export const localStg = {
    get: key => globalThis.themeTestStorage.get(key) ?? null,
    set: (key, value) => globalThis.themeTestStorage.set(key, JSON.parse(JSON.stringify(value))),
  }`,
  '@/constants/app': `export const DARK_CLASS = 'dark'`,
  '@sa/utils': `export const toggleHtmlClass = () => ({ add() {}, remove() {} })`,
  '../auth': `export const useAuthStore = () => ({ userInfo: { userName: '' } })`,
  '@/services/events': `export const listenAppEvent = async (name, handler) => {
    globalThis.themeTestListeners.set(name, handler);
    return () => globalThis.themeTestListeners.delete(name);
  };
  export const emitAppEvent = async (name, value) => {
    globalThis.themeTestEvents.push({ name, value: structuredClone(value) });
  };`,
}
const result = await build({
  stdin: {
    contents: `export * from './src/store/modules/theme/shared.ts';
      export * from './src/theme/interface-font.ts';
      export * from './src/theme/settings.ts';
      export * from './src/theme/typography.ts';
      export * from './src/theme/presets.ts';
      export * from './src/store/modules/theme/index.ts';
      export { createPinia } from 'pinia';
      export { nextTick } from 'vue';`,
    resolveDir: appRoot,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  plugins: [{
    name: 'theme-platform-fixture',
    setup(builder) {
      builder.onResolve({ filter: /^@|^\.\.\/auth$/ }, ({ path: name }) => {
        if (name in mocks)
          return { path: name, namespace: 'theme-fixture' }
        if (name.startsWith('@/'))
          return { path: path.join(appRoot, 'src', `${name.slice(2)}${name === '@/enum' ? '/index' : ''}.ts`) }
      })
      builder.onLoad({ filter: /.*/, namespace: 'theme-fixture' }, ({ path: name }) => ({ contents: mocks[name] }))
    },
  }],
})
const bundle = path.join(temporary, 'theme.mjs')
await writeFile(bundle, result.outputFiles[0].text)
const { restoreInterfaceFont, normalizeInterfaceFont, initThemeSettings, getNaiveTheme, getThemeSurfaceColors, createThemeToken, themeSettings, normalizeFontSize, getUiFontSize, resolveThemePreset, useThemeStore, createPinia, nextTick } = await import(pathToFileURL(bundle).href)

beforeEach(() => {
  globalThis.themeTestStorage = new Map()
  globalThis.themeTestListeners = new Map()
  globalThis.themeTestEvents = []
  globalThis.localStorage = { getItem: key => globalThis.themeTestStorage.get(`raw:${key}`) ?? null }
})

// 只替换浏览器边界，Store、Vue watch、预设应用和事件接收逻辑均运行真实实现。
function createThemeStoreFixture() {
  const variables = new Map()
  let themeStyle
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  globalThis.document = {
    documentElement: {
      style: {
        setProperty: (key, value) => variables.set(key, value),
        removeProperty: key => variables.delete(key),
      },
      toggleAttribute() {},
    },
    querySelector: () => themeStyle,
    createElement: () => ({}),
    head: { appendChild: style => themeStyle = style },
  }
  globalThis.getComputedStyle = () => ({ fontFamily: variables.get('--wb-interface-font') || 'sans-serif' })
  return { store: useThemeStore(createPinia()), variables, css: () => themeStyle.textContent }
}

function legacySettings(value) {
  globalThis.themeTestStorage.set('raw:dbx_workbench_settings_v2', JSON.stringify(value))
}

function colors(settings) {
  return { primary: settings.themeColor, ...settings.otherColor, info: settings.isInfoFollowPrimary ? settings.themeColor : settings.otherColor.info }
}

it('仅有旧配置时使用当前默认值，启动字体不读取旧设置', () => {
  legacySettings({ interfaceFont: 'noto-serif-sc', theme: 'cursor', themeMode: 'light', borderRadius: 'large' })
  assert.deepEqual(initThemeSettings(), themeSettings)
  const { store, variables } = createThemeStoreFixture()
  try {
    restoreInterfaceFont()
    assert.equal(variables.has('--wb-interface-font'), false)
  }
  finally {
    store.$dispose()
  }
})

it('保留内置苹方字体选项并回退未知字体配置', () => {
  assert.equal(normalizeInterfaceFont('PingFang SC'), 'PingFang SC')
  assert.equal(normalizeInterfaceFont('unknown font'), 'dbx-default')
  const { store, variables } = createThemeStoreFixture()
  try {
    store.interfaceFont = 'PingFang SC'
    assert.match(variables.get('--wb-interface-font'), /Workbench PingFang SC/)
  }
  finally {
    store.$dispose()
  }
})

it('从统一主题配置恢复主色和圆角', () => {
  globalThis.themeTestStorage.set('themeSettings', { ...structuredClone(themeSettings), themeColor: '#a855f7', themeRadius: 0 })
  const settings = initThemeSettings()
  assert.equal(settings.themeColor, '#a855f7')
  assert.equal(settings.themeRadius, 0)
})

it('主色和圆角覆盖预设组件值，背景与文字跟随统一明暗 token', () => {
  const settings = { ...structuredClone(themeSettings), themeColor: '#8b5cf6', themeRadius: 0 }
  const overrides = { common: { primaryColor: '#0000ff' }, Card: { borderRadius: '16px' }, Input: { borderRadius: '10px' } }
  for (const dark of [false, true]) {
    const naive = getNaiveTheme(colors(settings), settings, overrides, dark)
    const surface = getThemeSurfaceColors(settings, dark)
    assert.equal(naive.common.primaryColor, '#8b5cf6')
    assert.equal(naive.common.borderRadius, '0px')
    assert.equal(naive.Card.borderRadius, '0px')
    assert.equal(naive.Input.borderRadius, '0px')
    assert.equal(naive.common.cardColor, surface.container)
    assert.equal(naive.common.textColorBase, surface.text)
  }
  assert.notEqual(getThemeSurfaceColors(settings, false).container, getThemeSurfaceColors(settings, true).container)
  assert.equal(overrides.Card.borderRadius, '16px')
})

it('主题 CSS 与 Naive UI 使用相同主色，切换明暗不改主色', () => {
  const settings = { ...structuredClone(themeSettings), themeColor: '#ec4899' }
  const { themeTokens, darkThemeTokens } = createThemeToken(colors(settings), settings.tokens)
  assert.equal(themeTokens.colors.primary, '#ec4899')
  assert.equal(darkThemeTokens.colors.primary, '#ec4899')
  assert.equal(getNaiveTheme(colors(settings), settings).common.primaryColor, '#ec4899')
})

it('推荐色预设也保持全局主色、CSS 和 Naive UI 一致', () => {
  const settings = { ...structuredClone(themeSettings), themeColor: '#78a878', recommendColor: true }
  const globalColors = colors(settings)
  const { themeTokens, darkThemeTokens } = createThemeToken(globalColors, settings.tokens, settings.recommendColor)
  for (const dark of [false, true]) {
    const tokens = dark ? darkThemeTokens : themeTokens
    const naive = getNaiveTheme(globalColors, settings, undefined, dark)
    assert.equal(tokens.colors.primary, settings.themeColor)
    assert.equal(naive.common.primaryColor, tokens.colors.primary)
    assert.equal(naive.LoadingBar.colorLoading, tokens.colors.nprogress)
  }
})

it('明暗主题的文本、数字和选择控件均有边框，保留交互与校验状态', async () => {
  const settings = structuredClone(themeSettings)
  for (const dark of [true, false]) {
    const base = dark ? darkTheme : lightTheme
    const overrides = getNaiveTheme(colors(settings), settings, undefined, dark)
    const border = `1px solid ${getThemeSurfaceColors(settings, dark).border}`
    for (const component of [NInput, NInputNumber, NSelect, NDatePicker, NTimePicker, NCascader, NTreeSelect]) {
      const app = createSSRApp({
        render: () => h(NConfigProvider, { theme: base, themeOverrides: overrides }, () => h(component)),
      })
      setupSsr(app)
      const html = await renderToString(app)
      assert.ok(html.includes(`--n-border:${border};`), `${dark ? 'dark' : 'light'} ${component.name}: visible border`)
      const defaults = base.Input.self({ ...base.common, ...overrides.common })
      for (const [css, token] of [['hover', 'borderHover'], ['focus', 'borderFocus'], ['warning', 'borderWarning'], ['error', 'borderError']]) {
        assert.ok(html.includes(`--n-border-${css}:${defaults[token]};`), `${component.name}: preserve ${css}`)
      }
      if (html.includes('n-input__input'))
        assert.ok(html.includes(`--n-border-disabled:${border};`), `${component.name}: disabled border`)
    }
  }
})

it('旧缓存和非法字号回退默认值，有效数值取整并限制在 12–18', () => {
  assert.equal(initThemeSettings().fontSize, 14)
  for (const invalid of [undefined, null, '', '18', NaN, Infinity, -Infinity, {}, []]) {
    globalThis.themeTestStorage.set('themeSettings', { fontSize: invalid })
    assert.equal(initThemeSettings().fontSize, 14)
  }
  for (const [value, expected] of [[0, 12], [11, 12], [12, 12], [14.4, 14], [14.6, 15], [18, 18], [999, 18]]) {
    assert.equal(normalizeFontSize(value), expected)
    globalThis.themeTestStorage.set('themeSettings', { fontSize: value })
    assert.equal(initThemeSettings().fontSize, expected)
  }
})

it('字号边界保留层级且控件高度足够容纳文字，默认值保持原大小', () => {
  for (const fontSize of [12, 14, 18]) {
    const settings = { ...structuredClone(themeSettings), fontSize }
    const naive = getNaiveTheme(colors(settings), settings)
    assert.equal(naive.common.fontSize, `${fontSize}px`)
    assert.ok(getUiFontSize(11, fontSize) >= 11)
    assert.ok(getUiFontSize(16, fontSize) > getUiFontSize(13, fontSize))
    for (const size of ['Tiny', 'Small', 'Medium', 'Large']) {
      const text = Number.parseFloat(naive.common[`fontSize${size}`])
      const height = Number.parseFloat(naive.common[`height${size}`])
      assert.ok(height >= text * 1.5 + 4, `${fontSize}px ${size}: text must fit`)
    }
  }
  for (const size of [9, 11, 12, 13, 14, 16, 20])
    assert.equal(getUiFontSize(size, 14), size)
})

const unityPreset = JSON.parse(await readFile(new URL('../src/theme/preset/unity.json', import.meta.url), 'utf8'))
const defaultPreset = JSON.parse(await readFile(new URL('../src/theme/preset/default.json', import.meta.url), 'utf8'))

it('Unity 外观预设保留布局与水印，缓存恢复后仍有独立面板和输入框层次', () => {
  const current = structuredClone(themeSettings)
  current.sider.width = 321
  current.tab.visible = false
  current.watermark.text = 'My watermark'
  current.watermark.visible = true
  const { settings, overrides } = resolveThemePreset(unityPreset, current)
  assert.deepEqual(settings.sider, current.sider)
  assert.deepEqual(settings.tab, current.tab)
  assert.deepEqual(settings.watermark, current.watermark)
  assert.equal(settings.themeScheme, 'dark')
  assert.equal(settings.fontSize, 13)
  assert.equal(settings.themeRadius, 3)
  assert.equal(overrides, undefined)
  globalThis.themeTestStorage.set('themeSettings', settings)
  const restored = initThemeSettings()
  const surface = getThemeSurfaceColors(restored, true)
  assert.notEqual(surface.input, surface.container)
  assert.notEqual(surface.panel, surface.layout)
  assert.equal(surface.border, '#232323')
  assert.equal(getNaiveTheme(colors(restored), restored, undefined, true).common.inputColor, surface.input)
  assert.equal(getNaiveTheme(colors(restored), restored, undefined, true).InternalSelection.color, surface.input)
})

it('切换预设或明暗后不残留 Unity 样式，手动编辑不会污染内置预设', () => {
  const original = structuredClone(unityPreset)
  const { settings } = resolveThemePreset(unityPreset, themeSettings)
  settings.themeColor = '#a855f7'
  settings.themeRadius = 8
  settings.tokens.dark.surfaces.input = '#000000'
  assert.deepEqual(unityPreset, original)
  const reapplied = resolveThemePreset(unityPreset, settings).settings
  assert.equal(reapplied.tokens.dark.surfaces.input, '#282828')
  assert.equal(reapplied.themeRadius, 3)
  const light = getThemeSurfaceColors(reapplied, false)
  assert.equal(light.input, light.container)
  assert.equal(light.alternate, 'transparent')
  const reverted = resolveThemePreset(defaultPreset, reapplied, true).settings
  assert.equal(reverted.tokens.dark.surfaces, undefined)
  assert.equal(getThemeSurfaceColors(reverted, true).input, getThemeSurfaceColors(reverted, true).container)
  assert.equal(getThemeSurfaceColors(reverted, true).alternate, 'transparent')
})

it('外观模式应用现有预设时保留行为设置，完整预设仍可配置布局且不写入元数据', () => {
  const current = structuredClone(themeSettings)
  current.header.height = 79
  current.page.animate = false
  current.watermark.text = 'custom'
  const { settings } = resolveThemePreset(defaultPreset, current, true)
  assert.equal(settings.header.height, 79)
  assert.equal(settings.page.animate, false)
  assert.equal(settings.watermark.text, 'custom')
  const full = resolveThemePreset(defaultPreset, current).settings
  assert.equal(full.header.height, defaultPreset.header.height)
  for (const key of ['name', 'desc', 'version', 'scope', 'naiveui'])
    assert.equal(key in full, false)
})

it('字体仅使用统一配置，应用预设不重置字体', () => {
  legacySettings({ interfaceFont: 'noto-serif-sc', layout: 'compact' })
  let settings = initThemeSettings()
  assert.equal(settings.interfaceFont, 'dbx-default')
  settings.interfaceFont = 'noto-sans-sc'
  globalThis.themeTestStorage.set('themeSettings', settings)
  settings = initThemeSettings()
  assert.equal(settings.interfaceFont, 'noto-sans-sc')
  for (const preset of [unityPreset, defaultPreset])
    assert.equal(resolveThemePreset(preset, settings).settings.interfaceFont, 'noto-sans-sc')
})

function contrastRatio(a, b) {
  const luminance = (hex) => {
    const digits = hex.replace('#', '')
    const full = digits.length === 3 ? [...digits].map(x => x + x).join('') : digits
    return [0, 2, 4].map(i => Number.parseInt(full.slice(i, i + 2), 16) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0)
  }
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

it('Unity 明暗主色在 CSS、Naive UI 与跟随主色的信息色中一致，文字和按钮达到 4.5:1', () => {
  const { settings } = resolveThemePreset(unityPreset, themeSettings)
  const { themeTokens, darkThemeTokens } = createThemeToken(colors(settings), settings.tokens, false, settings.isInfoFollowPrimary)
  for (const [dark, tokens, background, theme] of [
    [false, themeTokens, '#ffffff', lightTheme],
    [true, darkThemeTokens, '#383838', darkTheme],
  ]) {
    const naive = getNaiveTheme(colors(settings), settings, undefined, dark)
    assert.equal(naive.common.primaryColor, tokens.colors.primary)
    assert.equal(naive.common.infoColor, tokens.colors.primary)
    assert.equal(tokens.colors.info, tokens.colors.primary)
    assert.ok(contrastRatio(tokens.colors.primary, background) >= 4.5)
    const button = theme.Button.self({ ...theme.common, ...naive.common })
    for (const suffix of ['', 'Hover', 'Pressed']) {
      assert.ok(contrastRatio(button[`color${suffix}Primary`], button[`textColor${suffix}Primary`]) >= 4.5, `${dark ? 'dark' : 'light'} ${suffix}: ${button[`color${suffix}Primary`]} / ${button[`textColor${suffix}Primary`]}`)
    }
  }
})

it('字体本地修改会广播和缓存，远端快照更新 DOM 不回声，销毁 Store 注销监听', async () => {
  globalThis.themeTestStorage.set('themeSettings', { interfaceFont: 'noto-serif-sc' })
  const { store, variables } = createThemeStoreFixture()
  try {
    assert.equal(store.interfaceFont, 'noto-serif-sc')
    store.interfaceFont = 'noto-sans-sc'
    await nextTick()
    assert.match(variables.get('--wb-interface-font'), /Noto Sans SC/)
    assert.equal(globalThis.themeTestStorage.get('themeSettings').interfaceFont, 'noto-sans-sc')
    const message = globalThis.themeTestEvents.at(-1)
    assert.equal(message.name, 'theme:settings')
    assert.equal(message.value.settings.interfaceFont, 'noto-sans-sc')
    const count = globalThis.themeTestEvents.length
    message.value.settings.interfaceFont = 'noto-serif-sc'
    globalThis.themeTestListeners.get('theme:settings')(message.value)
    await nextTick()
    assert.equal(store.interfaceFont, 'noto-serif-sc')
    assert.match(variables.get('--wb-interface-font'), /Noto Serif SC/)
    assert.equal(globalThis.themeTestEvents.length, count)
    assert.equal(globalThis.themeTestStorage.get('themeSettings').interfaceFont, 'noto-serif-sc')
  }
  finally {
    store.$dispose()
  }
  assert.equal(globalThis.themeTestListeners.size, 0)
})

it('Store 应用 Unity 后切换明暗和手动改色保持组件、CSS、缓存一致，换预设清除覆盖', async () => {
  const { store, css } = createThemeStoreFixture()
  try {
    store.applyPreset(unityPreset)
    store.setThemeScheme('light')
    await nextTick()
    assert.equal(store.themeColors.primary, '#006bb3')
    assert.equal(store.naiveTheme.common.primaryColor, '#006bb3')
    assert.match(css(), /--primary-color: 0 107 179/)
    store.setThemeScheme('dark')
    await nextTick()
    assert.equal(store.themeColors.primary, unityPreset.themeColor)
    store.updateThemeColors('primary', '#a855f7')
    store.setThemeScheme('light')
    await nextTick()
    assert.equal(store.themeColors.primary, '#a855f7')
    assert.equal(store.naiveTheme.common.primaryColor, '#a855f7')
    assert.equal(globalThis.themeTestStorage.get('themeSettings').tokens.light.colors.primary, undefined)
    store.applyPreset(unityPreset)
    store.applyPreset(defaultPreset)
    await nextTick()
    assert.equal(store.tokens.light.colors.primary, undefined)
  }
  finally {
    store.$dispose()
  }
})
