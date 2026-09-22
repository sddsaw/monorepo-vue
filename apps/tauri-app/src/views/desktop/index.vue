<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { NButton, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import FeatureCard from '@/components/FeatureCard.vue'
import { logger } from '@/plugins/logger'
import { emitAppEvent, useAppEventListener } from '@/services/events'
import { getSystemInfo, greet, openNewWindow, type SystemInfo } from '@/services/ipc'
import { openLogDir } from '@/services/ipc/system'
import { getStoreValue, setStoreValue } from '@/services/store'
import { useAppStore, useAuthStore, useThemeStore } from '@/store'

const appStore = useAppStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const message = useMessage()
const inTauri = appStore.inTauri

async function handleLogout() {
  await authStore.resetStore()
  message.info('已安全退出登录')
}

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
    message.success('Rust IPC 调用成功')
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
    message.success('系统信息获取成功')
  }
  catch (err: any) {
    message.error(`获取系统信息异常: ${err}`)
  }
  finally {
    loadingSysInfo.value = false
  }
}

// 2. 原生持久化存储 (Tauri Store)
const storeKey = 'user_custom_note'
const storeText = ref('')
const isStoreSaving = ref(false)

onMounted(async () => {
  const saved = await getStoreValue<string>(storeKey, '这是一个持久化存储在 AppData/settings.json 中的备忘笔记')
  if (saved) {
    storeText.value = saved
  }
})

async function handleSaveStore() {
  isStoreSaving.value = true
  try {
    await setStoreValue(storeKey, storeText.value)
    logger.info('持久化配置更新成功', { key: storeKey, value: storeText.value })
    message.success('配置已写入本地 settings.json')
  }
  catch (err) {
    message.error(`持久化保存失败: ${err}`)
  }
  finally {
    isStoreSaving.value = false
  }
}

// 3. 原生统一日志中心
function handleTriggerLog(type: 'info' | 'warn' | 'error') {
  const timestamp = new Date().toLocaleTimeString()
  if (type === 'info') {
    logger.info(`用户在界面手动触发了一条 INFO 日志 [${timestamp}]`, { from: 'Home.vue' })
    message.info('INFO 日志已记录')
  }
  else if (type === 'warn') {
    logger.warn(`用户在界面手动触发了一条 WARN 警告 [${timestamp}]`, { reason: 'UI Manual Test' })
    message.warning('WARN 警告已记录')
  }
  else {
    logger.error(`用户在界面手动触发了一条 ERROR 错误 [${timestamp}]`, { stack: 'Simulated error trace' })
    message.error('ERROR 错误已记录')
  }
}

// 4. 跨窗口事件通信 (Cross-Window Event Bus)
const broadcastMsgInput = ref('Hello from Main Window!')
const receivedCrossMessages = ref<Array<{ from: string, content: string, time: string }>>([])

useAppEventListener('window:message', (payload) => {
  receivedCrossMessages.value.unshift({
    from: payload.from,
    content: payload.content,
    time: new Date().toLocaleTimeString(),
  })
  if (receivedCrossMessages.value.length > 3) {
    receivedCrossMessages.value.pop()
  }
  message.info(`收到跨窗口消息: ${payload.content}`)
})

async function handleSendBroadcast() {
  if (!broadcastMsgInput.value.trim())
    return
  await emitAppEvent('window:message', {
    from: '主窗口',
    content: broadcastMsgInput.value.trim(),
  })
  message.success('跨窗口广播已发送')
}

// 5. Dialog 对话框
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
    const confirmed = await ask('确定要执行此核心系统操作吗？', {
      title: 'Soybean Desktop 确认',
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

// 6. Notification 系统通知
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
        body: '🎉 桌面系统通知投递成功！原生通知中心交互正常。',
      })
      message.success('通知已发送至操作系统通知中心')
    }
    else {
      message.warning('未获得系统通知权限')
    }
  }
  catch (err: any) {
    message.error(`发送通知失败: ${err}`)
  }
}

// 7. 多窗口管理 (Multi-Window)
const windowOpenStatus = ref('')
const loadingSubWin = ref(false)
const loadingWebWin = ref(false)

async function handleOpenSubWindow() {
  try {
    loadingSubWin.value = true
    await openNewWindow({
      label: 'sub-window',
      title: '子窗口 - 数据与通信面板',
      url: 'index.html#/sub-window',
      width: 680,
      height: 520,
    })
    windowOpenStatus.value = '独立原生子窗口已就绪'
    message.success('原生子窗口已激活打开')
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
      width: 980,
      height: 700,
    })
    windowOpenStatus.value = '外部文档原生窗口已就绪'
    message.success('文档原生窗口已激活打开')
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
    <!-- 顶部 Banner：科技感流光渐变与现代毛玻璃 -->
    <div class="relative overflow-hidden border border-white/20 rounded-xl from-[#646cff] via-[#5b63ee] to-[#4338ca] bg-gradient-to-br p-6 text-white shadow-[#646cff]/20 shadow-xl">
      <!-- 流动光晕底衬 -->
      <div class="pointer-events-none absolute h-72 w-72 rounded-full bg-white/15 blur-3xl -right-24 -top-24" />
      <div class="pointer-events-none absolute h-64 w-64 rounded-full bg-[#818cf8]/20 blur-2xl -bottom-24 -left-24" />

      <div class="relative z-10 flex items-start justify-between">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="drop-shadow-xs text-2xl font-black tracking-tight">
              Soybean Admin Desktop
            </h1>
            <span class="border border-white/25 rounded bg-white/15 px-2 py-1 text-xs font-semibold backdrop-blur-md">
              Tauri v2 Native
            </span>
            <span
              class="inline-flex items-center gap-1 border rounded px-2 py-1 text-xs font-medium backdrop-blur-md"
              :class="inTauri ? 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30' : 'bg-amber-400/20 text-amber-200 border-amber-300/30'"
            >
              <span class="h-1.5 w-1.5 animate-pulse rounded-full" :class="inTauri ? 'bg-emerald-300' : 'bg-amber-300'" />
              {{ inTauri ? '桌面原生核心已连接' : 'Web 预览模拟中' }}
            </span>
          </div>

          <p class="max-w-2xl text-xs text-blue-100/90 leading-relaxed">
            欢迎回来，<span class="font-bold underline decoration-white/30">{{ authStore.userInfo.userName || '开发者' }}</span>（{{ authStore.userInfo.roles.join(', ') || '标准用户' }}）。生产级跨平台桌面架构规范。深度集成原生日志滚动存储、配置持久化 Store、端到端类型安全 IPC、跨窗口事件总线与沉浸式体验。
          </p>
        </div>

        <!-- 顶部操作区：明暗主题切换 -->
        <NButton
          circle
          secondary
          size="large"
          class="shadow-sm backdrop-blur-md !border-white/20 !bg-white/10 hover:!bg-white/20"
          :title="themeStore.darkMode ? '切换到浅色模式' : '切换到深色模式'"
          @click="themeStore.toggleThemeScheme"
        >
          <span class="text-base transition-transform duration-300 hover:rotate-12">{{ themeStore.darkMode ? '🌙' : '☀️' }}</span>
        </NButton>
      </div>
    </div>

    <!-- 功能矩阵栅格 -->
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3 md:grid-cols-2">
      <!-- 1. 原生统一日志中心 -->
      <FeatureCard
        title="统一原生日志 (Logger)"
        description="10MB 单文件滚动日志，双向输出至控制台与磁盘系统目录，支持一键定位。"
        tag="Native Logging"
        icon="carbon:catalog"
      >
        <div class="space-y-2">
          <!-- 三色精致分段按钮 -->
          <div class="grid grid-cols-3 gap-2">
            <NButton size="small" type="info" ghost @click="handleTriggerLog('info')">
              <template #icon>
                <SvgIcon icon="carbon:information" />
              </template>
              Info
            </NButton>
            <NButton size="small" type="warning" ghost @click="handleTriggerLog('warn')">
              <template #icon>
                <SvgIcon icon="carbon:warning" />
              </template>
              Warn
            </NButton>
            <NButton size="small" type="error" ghost @click="handleTriggerLog('error')">
              <template #icon>
                <SvgIcon icon="carbon:error" />
              </template>
              Error
            </NButton>
          </div>

          <!-- 打开日志文件夹 -->
          <NButton size="small" secondary block @click="openLogDir">
            <template #icon>
              <SvgIcon icon="carbon:folder-open" class="text-amber-500" />
            </template>
            在系统文件管理器中打开日志
          </NButton>
        </div>
      </FeatureCard>

      <!-- 2. 原生持久化存储 Store -->
      <FeatureCard
        title="持久化存储 (Store)"
        description="基于 tauri-plugin-store 持久化至 settings.json，内置防抖写盘，支持 Web 回退。"
        tag="Persistence"
        icon="carbon:data-base"
      >
        <div class="space-y-2">
          <div class="relative">
            <textarea
              v-model="storeText"
              rows="2"
              class="w-full resize-none border border-black/[0.08] rounded-lg bg-white p-2 text-xs text-slate-800 shadow-inner outline-none transition-all dark:border-white/[0.08] focus:border-blue-500 dark:bg-zinc-800/90 dark:text-zinc-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/15 dark:focus:border-blue-400 dark:placeholder:text-zinc-500"
              placeholder="输入文本，保存后应用重启依然完整保留"
            />
          </div>

          <NButton
            block
            type="primary"
            :loading="isStoreSaving"
            @click="handleSaveStore"
          >
            <template #icon>
              <SvgIcon icon="carbon:save" />
            </template>
            保存至持久化 Store
          </NButton>
        </div>
      </FeatureCard>

      <!-- 3. 跨窗口事件总线 Event Bus -->
      <FeatureCard
        title="跨窗口事件总线 (Event Bus)"
        description="类型安全的广播通道，Tauri 原生事件与浏览器 BroadcastChannel 双层保障。"
        tag="Event Bus"
        icon="carbon:radio"
      >
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <input
              v-model="broadcastMsgInput"
              type="text"
              class="h-8.5 flex-1 border border-black/[0.08] rounded-lg bg-white px-3 text-xs text-slate-800 outline-none transition-all dark:border-white/[0.08] focus:border-blue-500 dark:bg-zinc-800/90 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/15 dark:focus:border-blue-400"
              placeholder="输入广播消息"
            >
            <NButton type="primary" @click="handleSendBroadcast">
              <template #icon>
                <SvgIcon icon="carbon:send-alt" />
              </template>
              广播
            </NButton>
          </div>

          <!-- 最近收到的跨窗口消息气泡 -->
          <div class="min-h-12 border border-black/[0.04] rounded-lg bg-white/60 p-2 text-xs dark:border-white/[0.04] dark:bg-zinc-800/40">
            <div v-if="receivedCrossMessages.length > 0" class="space-y-1">
              <div
                v-for="(msg, idx) in receivedCrossMessages"
                :key="idx"
                class="flex items-center justify-between rounded bg-blue-500/8 px-2 py-1 text-[11px] text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"
              >
                <div class="truncate">
                  <span class="font-bold">[{{ msg.from }}]:</span> {{ msg.content }}
                </div>
                <span class="text-[10px] text-slate-400">{{ msg.time }}</span>
              </div>
            </div>
            <div v-else class="h-10 flex items-center justify-center text-[11px] text-slate-400 dark:text-zinc-500">
              打开子窗口并发送消息，主窗口将实时响应
            </div>
          </div>
        </div>
      </FeatureCard>

      <!-- 4. Rust IPC 交互 -->
      <FeatureCard
        title="Rust IPC 通信"
        description="通过 Tauri v2 的 invoke 机制调用 Rust 原生后端命令，高性能且内存安全。"
        tag="IPC Core"
        icon="carbon:connection-signal"
      >
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <input
              v-model="inputName"
              type="text"
              class="h-8.5 flex-1 border border-black/[0.08] rounded-lg bg-white px-3 text-xs text-slate-800 outline-none transition-all dark:border-white/[0.08] focus:border-blue-500 dark:bg-zinc-800/90 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/15 dark:focus:border-blue-400"
              placeholder="输入问候名称"
            >
            <NButton type="primary" :loading="loadingGreet" @click="handleGreet">
              <template #icon>
                <SvgIcon icon="carbon:connection-signal" />
              </template>
              Greet
            </NButton>
          </div>

          <div v-if="greetResult" class="truncate border border-indigo-500/20 rounded-lg bg-indigo-500/8 p-2 text-xs text-indigo-600 font-mono dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300">
            {{ greetResult }}
          </div>

          <NButton
            size="small"
            secondary
            block
            :loading="loadingSysInfo"
            @click="handleGetSysInfo"
          >
            <template #icon>
              <SvgIcon icon="carbon:chip" class="text-blue-500" />
            </template>
            读取原生系统软硬件规格
          </NButton>

          <div v-if="systemInfoResult" class="grid grid-cols-3 gap-1 border border-black/[0.06] rounded-lg bg-white p-2 text-[11px] text-slate-600 font-mono dark:border-white/[0.06] dark:bg-zinc-800/60 dark:text-zinc-300">
            <div class="text-center">
              <span class="block text-[10px] text-slate-400">OS</span>{{ systemInfoResult.os }}
            </div>
            <div class="text-center">
              <span class="block text-[10px] text-slate-400">ARCH</span>{{ systemInfoResult.arch }}
            </div>
            <div class="text-center">
              <span class="block text-[10px] text-slate-400">TAURI</span>{{ systemInfoResult.tauri_version }}
            </div>
          </div>
        </div>
      </FeatureCard>

      <!-- 5. 原生对话框与通知 -->
      <FeatureCard
        title="原生系统能力 (Dialog & Notify)"
        description="支持系统级原生确认询问框、文件选取器及系统通知气泡。"
        tag="Native System"
        icon="carbon:popup"
      >
        <div class="space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <NButton secondary size="small" @click="handleAskDialog">
              <template #icon>
                <SvgIcon icon="carbon:chat" class="text-blue-500" />
              </template>
              系统询问框
            </NButton>

            <NButton secondary size="small" @click="handleOpenDialog">
              <template #icon>
                <SvgIcon icon="carbon:document-add" class="text-emerald-500" />
              </template>
              选择本地文件
            </NButton>
          </div>

          <div v-if="selectedFilePath" class="truncate border border-emerald-500/20 rounded-lg bg-emerald-500/8 p-2 text-[11px] text-emerald-600 font-mono dark:text-emerald-400">
            路径: {{ selectedFilePath }}
          </div>

          <NButton
            type="info"
            secondary
            block
            @click="handleSendNotification"
          >
            <template #icon>
              <SvgIcon icon="carbon:notification" />
            </template>
            发送操作系统桌面通知
          </NButton>
        </div>
      </FeatureCard>

      <!-- 6. 多原生窗口管理 -->
      <FeatureCard
        title="多原生窗口 (Multi-Window)"
        description="管理多个独立的操作系统原生窗口实例，支持独立路由与外部页面加载。"
        tag="Multi-Window"
        icon="carbon:window-overlay"
      >
        <div class="space-y-2">
          <NButton
            type="primary"
            secondary
            block
            :loading="loadingSubWin"
            @click="handleOpenSubWindow"
          >
            <template #icon>
              <SvgIcon icon="carbon:new-tab" />
            </template>
            打开独立原生子窗口 (Sub-Window)
          </NButton>

          <NButton
            secondary
            block
            size="small"
            :loading="loadingWebWin"
            @click="handleOpenWebWindow"
          >
            <template #icon>
              <SvgIcon icon="carbon:launch" class="text-indigo-500" />
            </template>
            在原生窗口中加载 Tauri 开发文档
          </NButton>

          <div v-if="windowOpenStatus" class="border border-blue-500/15 rounded-lg bg-blue-500/8 p-2 text-center text-[11px] text-blue-600 font-medium dark:text-blue-300">
            {{ windowOpenStatus }}
          </div>
        </div>
      </FeatureCard>

      <!-- 7. 桌面级体验强化：键帽式展示 -->
      <FeatureCard
        title="快捷键与 Deep Link"
        description="系统级热键无感唤醒，支持从浏览器等外部应用通过自定义协议唤起。"
        tag="Desktop Enhancements"
        icon="carbon:keyboard"
      >
        <div class="text-xs space-y-2">
          <!-- 拟物化键盘按键 -->
          <div class="flex items-center justify-between border border-black/[0.05] rounded-xl bg-white/70 p-3 dark:border-white/[0.05] dark:bg-zinc-800/50">
            <span class="text-slate-600 font-medium dark:text-zinc-300">全局唤醒热键:</span>
            <div class="flex items-center gap-1">
              <kbd class="shadow-xs border border-slate-300 rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700 font-bold font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Option (⌥)</kbd>
              <span class="text-slate-400">+</span>
              <kbd class="shadow-xs border border-slate-300 rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700 font-bold font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Shift (⇧)</kbd>
              <span class="text-slate-400">+</span>
              <kbd class="shadow-xs border border-[#646cff]/40 rounded bg-[#646cff]/10 px-2 py-1 text-[11px] text-[#646cff] font-bold font-mono dark:border-[#646cff]/50 dark:bg-[#646cff]/20 dark:text-[#818cf8]">S</kbd>
            </div>
          </div>

          <div class="flex items-center justify-between border border-black/[0.05] rounded-xl bg-white/70 p-3 dark:border-white/[0.05] dark:bg-zinc-800/50">
            <span class="text-slate-600 font-medium dark:text-zinc-300">外部唤起协议:</span>
            <span class="border border-[#646cff]/15 rounded bg-[#646cff]/8 px-2 py-1 text-[11px] text-[#646cff] font-mono dark:text-[#818cf8]">
              soybean://sub-window
            </span>
          </div>
        </div>
      </FeatureCard>

      <!-- 8. Monorepo 共享资产生态 -->
      <FeatureCard
        title="Monorepo 共享包生态"
        description="直接复用 packages/ 下的 @sa/components、@sa/hooks 与 @sa/utils 核心资产。"
        tag="Monorepo Packages"
        icon="carbon:layers"
      >
        <div class="text-xs space-y-2">
          <div class="flex items-center justify-between rounded-lg bg-white/70 p-2 dark:bg-zinc-800/50">
            <span class="text-slate-700 font-medium dark:text-zinc-200">@sa/components</span>
            <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold dark:text-emerald-400">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> UI 组件共享
            </span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-white/70 p-2 dark:bg-zinc-800/50">
            <span class="text-slate-700 font-medium dark:text-zinc-200">@sa/hooks</span>
            <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold dark:text-emerald-400">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Vue3 状态 Hook
            </span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-white/70 p-2 dark:bg-zinc-800/50">
            <span class="text-slate-700 font-medium dark:text-zinc-200">@sa/utils</span>
            <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold dark:text-emerald-400">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 通用工具库
            </span>
          </div>
        </div>
      </FeatureCard>

      <!-- 9. 用户认证与安全凭据 -->
      <FeatureCard
        title="用户认证与安全鉴权"
        description="基于 Pinia 与本地 Store 双向持久化，管理当前登录凭证、角色权限与会话生命周期。"
        tag="Auth System"
        icon="carbon:user"
      >
        <div class="text-xs space-y-2">
          <div class="flex items-center justify-between rounded-lg bg-white/70 p-2 dark:bg-zinc-800/50">
            <span class="text-slate-600 font-medium dark:text-zinc-300">当前身份:</span>
            <span class="text-slate-800 font-bold dark:text-zinc-100">{{ authStore.userInfo.userName || '未登录' }}</span>
          </div>

          <div class="flex items-center justify-between rounded-lg bg-white/70 p-2 dark:bg-zinc-800/50">
            <span class="text-slate-600 font-medium dark:text-zinc-300">角色权限:</span>
            <span class="border border-primary/20 rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-semibold">
              {{ authStore.userInfo.roles.join(', ') || '标准用户' }}
            </span>
          </div>

          <NButton

            type="error"
            secondary
            block
            size="small"
            @click="handleLogout"
          >
            <template #icon>
              <SvgIcon icon="carbon:logout" />
            </template>
            安全退出登录 (Logout)
          </NButton>
        </div>
      </FeatureCard>
    </div>
  </div>
</template>
