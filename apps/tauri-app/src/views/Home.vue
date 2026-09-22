<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { inject, ref, type Ref } from 'vue'
import FeatureCard from '../components/FeatureCard.vue'
import { isTauri } from '../plugins/tauri'
import { getSystemInfo, greet, openNewWindow, type SystemInfo } from '../services/ipc'

const isDark = inject<Ref<boolean>>('isDark', ref(false))
const toggleDark = inject<() => void>('toggleDark', () => {})

const message = useMessage()
const inTauri = isTauri()

// 1. Rust IPC Greet
const inputName = ref('Soybean Developer')
const greetResult = ref('')
const systemInfoResult = ref<SystemInfo | null>(null)
const loadingGreet = ref(false)
const loadingSysInfo = ref(false)

async function handleGreet() {
  try {
    loadingGreet.value = true
    const res = await greet(inputName.value)
    greetResult.value = res
    message.success('调用 Rust IPC 成功')
  }
  catch (err: any) {
    message.error(`IPC 调用异常: ${err}`)
  }
  finally {
    loadingGreet.value = false
  }
}

async function handleGetSysInfo() {
  try {
    loadingSysInfo.value = true
    const res = await getSystemInfo()
    systemInfoResult.value = res
    message.success('获取系统信息成功')
  }
  catch (err: any) {
    message.error(`获取系统信息异常: ${err}`)
  }
  finally {
    loadingSysInfo.value = false
  }
}

// 2. Dialog 对话框
const selectedFilePath = ref('')

async function handleOpenDialog() {
  if (!inTauri) {
    message.warning('原生文件对话框需要在 Tauri 客户端中运行')
    return
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const file = await open({
      multiple: false,
      directory: false,
      title: '请选择一个文件',
    })
    if (typeof file === 'string') {
      selectedFilePath.value = file
      message.success(`已选择文件: ${selectedFilePath.value}`)
    }
  }
  catch (err: any) {
    message.error(`对话框异常: ${err}`)
  }
}

async function handleAskDialog() {
  if (!inTauri) {
    message.info('原生 Ask 确认框需在 Tauri 客户端中运行')
    return
  }

  try {
    const { ask } = await import('@tauri-apps/plugin-dialog')
    const confirmed = await ask('确定要执行此核心操作吗？', {
      title: 'Soybean Desktop 提示',
      kind: 'info',
    })
    if (confirmed) {
      message.success('用户点击了【确认】')
    }
    else {
      message.warning('用户点击了【取消】')
    }
  }
  catch (err: any) {
    message.error(`确认框异常: ${err}`)
  }
}

// 3. Notification 系统通知
async function handleSendNotification() {
  if (!inTauri) {
    message.info('桌面通知需在 Tauri 客户端中触发')
    return
  }

  try {
    const {
      isPermissionGranted,
      requestPermission,
      sendNotification,
    } = await import('@tauri-apps/plugin-notification')

    let hasPermission = await isPermissionGranted()
    if (!hasPermission) {
      const permission = await requestPermission()
      hasPermission = permission === 'granted'
    }

    if (hasPermission) {
      sendNotification({
        title: 'Soybean Desktop',
        body: '恭喜！Tauri v2 系统通知发送成功！🎉',
      })
      message.success('通知已发送到系统通知中心')
    }
    else {
      message.warning('未获得系统通知权限')
    }
  }
  catch (err: any) {
    message.error(`发送通知失败: ${err}`)
  }
}

// 4. Shell 外部链接
async function handleOpenExternal(url: string) {
  if (!inTauri) {
    window.open(url, '_blank')
    return
  }

  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(url)
    message.success('已在系统默认浏览器中打开链接')
  }
  catch (err: any) {
    message.error(`打开外部链接失败: ${err}`)
  }
}

// 5. File System 文件操作
const fileContent = ref('')
const writeStatus = ref('')

async function handleWriteFile() {
  if (!inTauri) {
    writeStatus.value = 'Web 模式不支持直接操作本地文件系统'
    message.warning('FS 操作需在桌面端内测试')
    return
  }

  try {
    const { writeTextFile, readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
    const sampleText = `这是 Soybean Desktop 自动创建的测试文件，写入时间: ${new Date().toLocaleString()}`

    await writeTextFile('soybean_test.txt', sampleText, {
      baseDir: BaseDirectory.AppData,
    })
    writeStatus.value = '写入成功！正在读取验证...'

    const content = await readTextFile('soybean_test.txt', {
      baseDir: BaseDirectory.AppData,
    })
    fileContent.value = content
    writeStatus.value = '文件写入并读取验证成功！存储于 AppData/soybean_test.txt'
    message.success('文件读写测试通过')
  }
  catch (err: any) {
    writeStatus.value = `操作失败: ${err}`
    message.error(`FS 操作异常: ${err}`)
  }
}

// 6. 多窗口管理 (Multi-Window)
const windowOpenStatus = ref('')
const loadingSubWin = ref(false)
const loadingWebWin = ref(false)

async function handleOpenSubWindow() {
  try {
    loadingSubWin.value = true
    await openNewWindow({
      label: 'sub-window',
      title: '子窗口 - 数据与工具面板',
      url: 'index.html#/sub-window',
      width: 680,
      height: 500,
    })
    windowOpenStatus.value = '已打开原生独立子窗口（若已打开则自动激活置顶）'
    message.success('打开原生子窗口成功')
  }
  catch (err: any) {
    message.error(`打开窗口失败: ${err}`)
  }
  finally {
    loadingSubWin.value = false
  }
}

async function handleOpenWebWindow() {
  try {
    loadingWebWin.value = true
    await openNewWindow({
      label: 'tauri-docs',
      title: 'Tauri 官方开发文档窗口',
      url: 'https://tauri.app',
      width: 960,
      height: 680,
    })
    windowOpenStatus.value = '已在原生独立窗口中加载外部网页'
    message.success('打开外部网页原生窗口成功')
  }
  catch (err: any) {
    message.error(`打开外部网页窗口失败: ${err}`)
  }
  finally {
    loadingWebWin.value = false
  }
}
</script>

<template>
  <div class="mx-auto h-full max-w-6xl overflow-y-auto p-6 space-y-6">
    <!-- 顶部 Banner -->
    <div class="relative overflow-hidden rounded-2xl from-blue-600 to-indigo-600 bg-gradient-to-r p-6 text-white shadow-lg">
      <div class="relative z-10 flex items-start justify-between">
        <div>
          <div class="mb-2 flex items-center space-x-3">
            <h1 class="text-2xl font-extrabold tracking-tight">
              Soybean Admin Tauri v2 桌面客户端
            </h1>
            <span class="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md">
              v2.0 Native
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-md"
              :class="inTauri ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/30' : 'bg-amber-400/20 text-amber-200 border border-amber-300/30'"
            >
              {{ inTauri ? 'Tauri Native 运行中' : 'Web 预览模式' }}
            </span>
          </div>
          <p class="max-w-2xl text-sm text-blue-100 leading-relaxed">
            依托 Vue 3、Naive UI 与 UnoCSS 深度整合的独立桌面端应用。采用操作系统原生窗口与标题栏，支持轻量级 Rust IPC 高效通信以及各类桌面原生系统能力。
          </p>
        </div>

        <!-- 顶部操作区：明暗主题切换 -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg transition-all hover:bg-white/25 active:scale-95"
          :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleDark"
        >
          <span>{{ isDark ? '🌙' : '☀️' }}</span>
        </button>
      </div>

      <!-- 背景光晕装饰 -->
      <div class="pointer-events-none absolute h-48 w-48 rounded-full bg-white/10 blur-2xl -bottom-10 -right-10" />
    </div>

    <!-- 功能矩阵 -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3 md:grid-cols-2">
      <!-- 1. Rust IPC 交互 -->
      <FeatureCard
        title="Rust IPC 通信"
        description="通过 Tauri v2 的 invoke 机制调用 Rust 原生后端命令，高性能且内存安全。"
        tag="IPC Core"
      >
        <div class="space-y-3">
          <div class="flex space-x-2">
            <NInput v-model:value="inputName" placeholder="输入问候名称" size="small" />
            <NButton type="primary" size="small" :loading="loadingGreet" @click="handleGreet">
              调用 Greet
            </NButton>
          </div>

          <div v-if="greetResult" class="border border-[#e2e8f0] rounded-lg bg-[#f8fafc] p-2.5 text-xs text-[#0ea5e9] font-mono dark:border-[#2e2e33] dark:bg-[#202024]">
            {{ greetResult }}
          </div>

          <NButton secondary block size="small" :loading="loadingSysInfo" @click="handleGetSysInfo">
            获取系统软硬件信息
          </NButton>

          <div v-if="systemInfoResult" class="border border-[#e2e8f0] rounded-lg bg-[#f8fafc] p-2.5 text-[11px] font-mono space-y-0.5 dark:border-[#2e2e33] dark:bg-[#202024]">
            <div>系统：{{ systemInfoResult.os }}</div>
            <div>架构：{{ systemInfoResult.arch }}</div>
            <div>Tauri：{{ systemInfoResult.tauri_version }}</div>
          </div>
        </div>
      </FeatureCard>

      <!-- 2. 原生对话框 Dialog -->
      <FeatureCard
        title="原生对话框 (Dialog)"
        description="支持系统级原生确认框、消息提示框及本地文件/目录选取对话框。"
        tag="Plugin Dialog"
      >
        <div class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <NButton secondary size="small" @click="handleAskDialog">
              系统询问框 (Ask)
            </NButton>
            <NButton type="primary" secondary size="small" @click="handleOpenDialog">
              选择本地文件
            </NButton>
          </div>

          <div v-if="selectedFilePath" class="break-all border border-[#e2e8f0] rounded-lg bg-[#f8fafc] p-2.5 text-xs text-[#10b981] font-mono dark:border-[#2e2e33] dark:bg-[#202024]">
            已选路径: {{ selectedFilePath }}
          </div>
        </div>
      </FeatureCard>

      <!-- 3. 桌面系统通知 Notification -->
      <FeatureCard
        title="桌面通知 (Notification)"
        description="向操作系统原生通知中心投递气泡通知，支持通知权限自动申请。"
        tag="Plugin Notification"
      >
        <div class="space-y-3">
          <NButton type="info" block size="small" @click="handleSendNotification">
            发送桌面系统通知
          </NButton>
          <p class="text-[11px] text-[#94a3b8]">
            点击后将请求通知权限并发送一条测试气泡。
          </p>
        </div>
      </FeatureCard>

      <!-- 4. Shell 插件外部调度 -->
      <FeatureCard
        title="外部调度 (Shell)"
        description="安全调用默认浏览器打开外部网页链接，防止 WebView 内意外跳转。"
        tag="Plugin Shell"
      >
        <div class="flex flex-wrap gap-2">
          <NButton secondary size="small" @click="handleOpenExternal('https://tauri.app')">
            打开 Tauri 官网
          </NButton>
          <NButton secondary size="small" @click="handleOpenExternal('https://github.com/tauri-apps/tauri')">
            Tauri GitHub
          </NButton>
        </div>
      </FeatureCard>

      <!-- 5. 文件系统读写 FS -->
      <FeatureCard
        title="文件系统 (FS)"
        description="遵循沙箱安全策略在应用安全目录 (AppData) 中进行文本文件创建与读取。"
        tag="Plugin FS"
      >
        <div class="space-y-2.5">
          <NButton type="warning" secondary block size="small" @click="handleWriteFile">
            写入并读取 AppData 测试文件
          </NButton>
          <div v-if="writeStatus" class="break-all border border-[#e2e8f0] rounded-lg bg-[#f8fafc] p-2.5 text-xs text-[#f59e0b] font-mono dark:border-[#2e2e33] dark:bg-[#202024]">
            {{ writeStatus }}
          </div>
          <div v-if="fileContent" class="rounded bg-gray-500/10 p-2 text-[11px] text-gray-500 dark:text-gray-400">
            内容: {{ fileContent }}
          </div>
        </div>
      </FeatureCard>

      <!-- 6. 多窗口管理 Multi-Window -->
      <FeatureCard
        title="多原生窗口 (Multi-Window)"
        description="支持创建和管理多个独立的操作系统原生窗口，支持内部路由与外链渲染。"
        tag="Multi-Window"
      >
        <div class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <NButton type="primary" secondary size="small" :loading="loadingSubWin" @click="handleOpenSubWindow">
              打开子页面窗口
            </NButton>
            <NButton secondary size="small" :loading="loadingWebWin" @click="handleOpenWebWindow">
              原生打开文档网页
            </NButton>
          </div>
          <div v-if="windowOpenStatus" class="border border-[#e2e8f0] rounded-lg bg-[#f8fafc] p-2 text-xs text-[#0284c7] font-mono dark:border-[#2e2e33] dark:bg-[#202024]">
            {{ windowOpenStatus }}
          </div>
        </div>
      </FeatureCard>

      <!-- 7. 共享包复用 Materials / Components -->
      <FeatureCard
        title="Monorepo 共享包生态"
        description="直接使用 packages/ 目录下的 @sa/components、@sa/hooks 与 @sa/utils 核心资产。"
        tag="Monorepo Packages"
      >
        <div class="text-xs text-[#64748b] space-y-2 dark:text-[#94a3b8]">
          <div class="flex items-center space-x-2">
            <span class="h-2 w-2 rounded-full bg-emerald-500" />
            <span>@sa/components (UI 共享组件)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="h-2 w-2 rounded-full bg-emerald-500" />
            <span>@sa/hooks (Vue 3 通用 Hooks)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="h-2 w-2 rounded-full bg-emerald-500" />
            <span>@sa/utils (常用业务工具函数库)</span>
          </div>
        </div>
      </FeatureCard>
    </div>
  </div>
</template>
