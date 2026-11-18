/* eslint-disable test/no-import-node-test -- 本应用未安装 Vitest，使用 Node 内置测试运行器。 */
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, beforeEach, it } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

// 使用现有 Vite 的编译依赖，测试真实主题计算与迁移，仅替换平台存储/DOM 边界。
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
    set: (key, value) => globalThis.themeTestStorage.set(key, structuredClone(value)),
  }`,
  '@/services/store': `export const getStoreValue = async key => globalThis.themeTestNative.get(key)`,
  '@/constants/app': `export const DARK_CLASS = 'dark'`,
  '@sa/utils': `export const toggleHtmlClass = () => ({ add() {}, remove() {} })`,
}
const result = await build({
  stdin: {
    contents: `export * from './src/store/modules/theme/shared.ts';
      export * from './src/theme/migration.ts';
      export * from './src/theme/settings.ts';
      export * from './src/theme/typography.ts';`,
    resolveDir: appRoot,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  plugins: [{
    name: 'theme-platform-fixture',
    setup(builder) {
      builder.onResolve({ filter: /^@/ }, ({ path: name }) => {
        if (name in mocks)
          return { path: name, namespace: 'theme-fixture' }
        if (name.startsWith('@/'))
          return { path: path.join(appRoot, 'src', `${name.slice(2)}.ts`) }
      })
      builder.onLoad({ filter: /.*/, namespace: 'theme-fixture' }, ({ path: name }) => ({ contents: mocks[name] }))
    },
  }],
})
const bundle = path.join(temporary, 'theme.mjs')
await writeFile(bundle, result.outputFiles[0].text)
const { migrateThemeSettings, initThemeSettings, getNaiveTheme, getThemeSurfaceColors, createThemeToken, themeSettings, normalizeFontSize, getUiFontSize } = await import(pathToFileURL(bundle).href)

beforeEach(() => {
  globalThis.themeTestStorage = new Map()
  globalThis.themeTestNative = new Map()
  globalThis.localStorage = { getItem: key => globalThis.themeTestStorage.get(`raw:${key}`) ?? null }
})

function legacySettings(value) {
  globalThis.themeTestStorage.set('raw:dbx_workbench_settings_v2', JSON.stringify(value))
}

function colors(settings) {
  return { primary: settings.themeColor, ...settings.otherColor, info: settings.isInfoFollowPrimary ? settings.themeColor : settings.otherColor.info }
}

it('旧生产用户已有 themeSettings 时，仍迁移实际工作台外观，且只迁移一次', async () => {
  globalThis.themeTestStorage.set('themeSettings', { ...structuredClone(themeSettings), themeColor: '#ff0000', themeRadius: 6 })
  legacySettings({ theme: 'cursor', themeMode: 'system', borderRadius: 'large', zoom: '120%' })
  globalThis.themeTestNative.set('workbench_theme_id', 'cursor')
  await migrateThemeSettings()
  let settings = initThemeSettings()
  assert.equal(settings.themeColor, '#3b82f6')
  assert.equal(settings.themeScheme, 'auto')
  assert.equal(settings.themeRadius, 10)
  assert.equal(settings.otherColor.error, themeSettings.otherColor.error)
  settings.themeColor = '#123456'
  settings.themeScheme = 'light'
  globalThis.themeTestStorage.set('themeSettings', settings)
  await migrateThemeSettings()
  settings = initThemeSettings()
  assert.equal(settings.themeColor, '#123456')
  assert.equal(settings.themeScheme, 'light')
})

it('旧自定义工作台主题只迁移主色和模式，不保留模块独立主题', async () => {
  globalThis.themeTestNative.set('workbench_theme_id', 'custom-theme')
  globalThis.themeTestNative.set('workbench_custom_theme', { id: 'custom-theme', accentColor: '#42b883', isDark: false })
  await migrateThemeSettings()
  const settings = initThemeSettings()
  assert.equal(settings.themeColor, '#42b883')
  assert.equal(settings.themeScheme, 'light')
  assert.deepEqual(settings.tokens, themeSettings.tokens)
})

it('没有旧工作台配置时保留全局偏好，开发和生产均可恢复', async () => {
  globalThis.themeTestStorage.set('themeSettings', { ...structuredClone(themeSettings), themeColor: '#a855f7', themeRadius: 0 })
  await migrateThemeSettings()
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
