<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { NButton, NTag, useMessage } from 'naive-ui'
import { onUnmounted, shallowRef } from 'vue'
import { $t } from '@/locales'

const message = useMessage()
const isCheckingUpdate = shallowRef(false)
let updateTimer: ReturnType<typeof setTimeout> | undefined

function handleCheckUpdate() {
  if (isCheckingUpdate.value)
    return
  isCheckingUpdate.value = true
  updateTimer = setTimeout(() => {
    isCheckingUpdate.value = false
    message.success($t('workbench.settings.latestVersion'))
  }, 800)
}

onUnmounted(() => clearTimeout(updateTimer))
</script>

<template>
  <div class="space-y-24px">
    <!-- 头部产品徽章卡片 -->
    <div class="relative overflow-hidden border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-layout p-16px">
      <div class="flex items-center gap-4">
        <div class="size-13 flex shrink-0 items-center justify-center rounded-[var(--theme-radius)] bg-[var(--active-color)] text-primary">
          <SvgIcon icon="ri:macbook-line" class="text-ui-26" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2.5">
            <h3 class="text-base-text font-bold tracking-tight text-ui-16">
              {{ $t('workbench.settings.aboutTitle') }}
            </h3>
            <NTag size="small" type="primary" round :bordered="false" class="font-mono text-ui-12">
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
        <NButton tag="a" href="https://github.com/soybeanjs/soybean-admin" target="_blank" rel="noopener noreferrer" size="small" secondary>
          {{ $t('workbench.settings.repository') }}
        </NButton>
      </div>
    </div>

    <!-- 技术底座概览 -->
    <div class="space-y-2">
      <div class="text-[var(--text-muted)] font-semibold tracking-wider uppercase text-ui-12">
        {{ $t('workbench.settings.specifications') }}
      </div>

      <div class="settings-about-grid grid grid-cols-2 gap-12px">
        <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
          <div class="text-[var(--text-muted)] text-ui-12">
            {{ $t('workbench.settings.engine') }}
          </div>
          <div class="mt-0.5 text-base-text font-semibold text-ui-13">
            Tauri 2.2 (Rust Core)
          </div>
        </div>

        <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
          <div class="text-[var(--text-muted)] text-ui-12">
            {{ $t('workbench.settings.uiStack') }}
          </div>
          <div class="mt-0.5 text-base-text font-semibold text-ui-13">
            Vue 3.5 + Vite + TypeScript
          </div>
        </div>

        <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
          <div class="text-[var(--text-muted)] text-ui-12">
            {{ $t('workbench.settings.docking') }}
          </div>
          <div class="mt-0.5 text-base-text font-semibold text-ui-13">
            Dockview Core
          </div>
        </div>

        <div class="border border-[var(--border-color)] rounded-[var(--theme-radius)] bg-container p-3">
          <div class="text-[var(--text-muted)] text-ui-12">
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
</template>

<style scoped>
@container settings (max-width: 480px) {
  .settings-about-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
