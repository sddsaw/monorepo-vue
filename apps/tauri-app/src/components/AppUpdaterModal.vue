<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { NButton } from 'naive-ui'
import { ref } from 'vue'
import { checkForAppUpdates, installAppUpdate, type UpdateCheckResult } from '../services/updater'

const showModal = ref(false)
const checking = ref(false)
const downloading = ref(false)
const downloadProgress = ref(0)
const updateInfo = ref<UpdateCheckResult | null>(null)

async function handleCheckUpdate(silent = false) {
  checking.value = true
  try {
    const res = await checkForAppUpdates()
    updateInfo.value = res
    if (res.status === 'available' || res.status === 'latest' || res.status === 'error') {
      showModal.value = true
    }
    else if (!silent) {
      // 若是用户主动点击检查，且无更新，弹窗友好提示
      showModal.value = true
    }
  }
  finally {
    checking.value = false
  }
}

async function handleStartUpdate() {
  if (!updateInfo.value?.updateHandle)
    return

  downloading.value = true
  downloadProgress.value = 0

  try {
    await installAppUpdate(updateInfo.value.updateHandle, (p) => {
      downloadProgress.value = p
    })
  }
  catch (err: unknown) {
    downloading.value = false
    updateInfo.value = {
      ...updateInfo.value,
      hasUpdate: false,
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

defineExpose({
  checkUpdate: handleCheckUpdate,
})
</script>

<template>
  <NModal
    v-model:show="showModal"
    preset="card"
    title="软件更新检测"
    class="max-w-480px"
    :mask-closable="!downloading"
    :closable="!downloading"
  >
    <div class="space-y-3">
      <!-- 检查失败 -->
      <template v-if="updateInfo?.status === 'error'">
        <div class="py-3 text-center space-y-2">
          <div class="text-3xl">
            ⚠️
          </div>
          <div class="text-sm text-slate-800 font-bold dark:text-zinc-100">
            更新检查失败
          </div>
          <div class="text-xs text-slate-400 dark:text-zinc-400">
            {{ updateInfo.errorMessage || '更新服务暂时不可用，请稍后重试。' }}
          </div>
          <div class="pt-2">
            <NButton block type="primary" @click="showModal = false">
              我知道了
            </NButton>
          </div>
        </div>
      </template>

      <!-- 当前环境不支持自动更新 -->
      <template v-else-if="updateInfo?.status === 'unsupported'">
        <div class="py-3 text-center space-y-2">
          <div class="text-3xl">
            ℹ️
          </div>
          <div class="text-sm text-slate-800 font-bold dark:text-zinc-100">
            当前环境不支持自动更新
          </div>
          <div class="text-xs text-slate-400 dark:text-zinc-400">
            请在桌面应用中检查更新。
          </div>
          <div class="pt-2">
            <NButton block type="primary" @click="showModal = false">
              我知道了
            </NButton>
          </div>
        </div>
      </template>

      <!-- 发现新版本 -->
      <template v-else-if="updateInfo?.hasUpdate">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 flex items-center justify-center rounded-lg bg-green-500/10 text-xl text-green-500">
            🚀
          </div>
          <div>
            <div class="text-[#0f172a] font-bold dark:text-[#f8fafc]">
              发现新版本 v{{ updateInfo.version }}
            </div>
            <div class="text-xs text-[#64748b] dark:text-[#94a3b8]">
              当前版本：v{{ updateInfo.currentVersion }}
            </div>
          </div>
        </div>

        <!-- 更新日志 -->
        <div class="border border-[#e2e8f0] rounded-xl bg-[#f8fafc] p-3 text-xs dark:border-[#27272a] dark:bg-[#121214]">
          <div class="mb-1 text-[#334155] font-semibold dark:text-[#cbd5e1]">
            更新日志：
          </div>
          <div class="whitespace-pre-wrap text-[#64748b] leading-relaxed dark:text-[#94a3b8]">
            {{ updateInfo.body || '包含多项功能优化与稳定性提升。' }}
          </div>
        </div>

        <!-- 下载进度条 -->
        <div v-if="downloading" class="pt-2 space-y-2">
          <div class="flex justify-between text-xs text-[#64748b] dark:text-[#94a3b8]">
            <span>正在下载并校验升级包...</span>
            <span class="font-bold font-mono">{{ downloadProgress }}%</span>
          </div>
          <NProgress
            type="line"
            :percentage="downloadProgress"
            :show-indicator="false"
            status="success"
            processing
          />
        </div>

        <!-- 底部按钮 -->
        <div class="flex justify-end gap-2 pt-2">
          <NButton
            :disabled="downloading"
            @click="showModal = false"
          >
            稍后提醒
          </NButton>
          <NButton
            type="primary"
            :loading="downloading"
            :disabled="downloading"
            @click="handleStartUpdate"
          >
            <template #icon>
              <SvgIcon icon="carbon:upgrade" />
            </template>
            {{ downloading ? '正在安装更新...' : '立即下载并更新' }}
          </NButton>
        </div>
      </template>

      <!-- 已是最新版本 -->
      <template v-else>
        <div class="py-3 text-center space-y-2">
          <div class="text-3xl">
            ✨
          </div>
          <div class="text-sm text-slate-800 font-bold dark:text-zinc-100">
            当前已是最新版本
          </div>
          <div class="text-xs text-slate-400 dark:text-zinc-400">
            当前版本 v{{ updateInfo?.currentVersion || 'unknown' }}，暂无新更新可用。
          </div>
          <div class="pt-2">
            <NButton
              block
              type="primary"
              @click="showModal = false"
            >
              我知道了
            </NButton>
          </div>
        </div>
      </template>
    </div>
  </NModal>
</template>
