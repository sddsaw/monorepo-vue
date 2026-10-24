<script setup lang="ts">
import { useTpStore } from '@/store/modules/tp'

const tpStore = useTpStore()
</script>

<template>
  <footer class="h-22px flex items-center justify-between px-3 text-11px bg-[#007acc] text-white select-none shrink-0 font-sans">
    <!-- 左侧状态项 -->
    <div class="flex items-center gap-3">
      <!-- Git 分支 -->
      <div class="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded transition-colors" title="当前 Git 分支">
        <SvgIcon icon="ri:git-branch-line" class="text-12px" />
        <span class="font-mono">taui</span>
      </div>

      <!-- 错误/警告统计 -->
      <div class="flex items-center gap-2 cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded transition-colors" title="DRC 校验错误">
        <span class="flex items-center gap-0.5">
          <span>✕</span>
          <span class="font-mono">{{ tpStore.validationResult.errors.length }}</span>
        </span>
        <span class="flex items-center gap-0.5">
          <span>⚠</span>
          <span class="font-mono">0</span>
        </span>
      </div>
    </div>

    <!-- 右侧状态项 -->
    <div class="flex items-center gap-3 font-mono text-10px">
      <!-- 未保存脏数据指示 -->
      <div v-if="tpStore.isDirty" class="flex items-center gap-1 text-yellow-300 font-bold animate-pulse">
        <span>●</span>
        <span>存在未保存修改</span>
      </div>

      <!-- 当前匹配的模块 -->
      <div v-if="tpStore.activeAdapter" class="text-white/80">
        {{ tpStore.activeAdapter.name }}
      </div>

      <!-- 编码格式 -->
      <div class="text-white/80">
        UTF-8
      </div>

      <!-- 客户端版本 -->
      <div class="text-white/80">
        ATE Studio v2.3
      </div>
    </div>
  </footer>
</template>
