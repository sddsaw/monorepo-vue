<script setup lang="ts">
import { useTpStore } from '@/store/modules/tp'

const tpStore = useTpStore()

const shortcuts = [
  { key: 'Ctrl + O', desc: '打开本地测试程序文件' },
  { key: 'Ctrl + S', desc: '保存当前测试项数据到磁盘' },
  { key: 'Ctrl + B', desc: '显示 / 隐藏主侧边栏' },
  { key: 'Ctrl + J', desc: '显示 / 隐藏底部问题与日志面板' },
  { key: 'Ctrl + P', desc: '快速查找测试项或管脚' },
]
</script>

<template>
  <div class="size-full flex flex-col select-none items-center justify-center p-8 text-gray-500">
    <div class="mb-4 h-16 w-16 flex items-center justify-center border border-[#333333] rounded-2xl bg-[#252526] text-3xl text-blue-400">
      ⚡
    </div>

    <h3 class="mb-1 text-base text-gray-300 font-bold">
      ATE Test Program Studio
    </h3>
    <p class="mb-6 text-xs text-gray-500">
      芯片测试程序可视化配置与分析工作台
    </p>

    <div class="mb-6 flex items-center gap-3">
      <button
        type="button"
        class="flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs text-white font-semibold shadow transition-colors hover:bg-blue-500"
        @click="tpStore.chooseAndOpenFile"
      >
        <SvgIcon icon="ri:folder-open-line" class="text-14px" />
        打开本地测试 JSON 文件
      </button>

      <button
        type="button"
        class="flex cursor-pointer items-center gap-2 border border-[#444] rounded bg-[#2d2d2d] px-4 py-2 text-xs text-gray-200 font-semibold shadow transition-colors hover:bg-[#3e3e42]"
        @click="tpStore.loadSampleData"
      >
        <SvgIcon icon="ri:cpu-line" class="text-14px text-blue-400" />
        载入演示测试程序
      </button>
    </div>

    <!-- 快捷键指南 -->
    <div class="max-w-sm w-full border border-[#2d2d2d] rounded-lg bg-[#1e1e1e]/60 p-3">
      <div class="mb-2 text-10px text-gray-500 font-bold tracking-wider font-mono uppercase">
        常用快捷键
      </div>
      <div class="text-xs font-mono space-y-1.5">
        <div v-for="sc in shortcuts" :key="sc.key" class="flex items-center justify-between text-gray-400">
          <span class="text-11px text-gray-500">{{ sc.desc }}</span>
          <kbd class="border border-[#3e3e42] rounded bg-[#252526] px-1.5 py-0.5 text-10px text-gray-300">{{ sc.key }}</kbd>
        </div>
      </div>
    </div>
  </div>
</template>
