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
  <div class="size-full flex flex-col items-center justify-center p-8 select-none text-gray-500">
    <div class="w-16 h-16 rounded-2xl bg-[#252526] border border-[#333333] flex items-center justify-center text-3xl mb-4 text-blue-400">
      ⚡
    </div>

    <h3 class="text-base font-bold text-gray-300 mb-1">ATE Test Program Studio</h3>
    <p class="text-xs text-gray-500 mb-6">芯片测试程序可视化配置与分析工作台</p>

    <div class="mb-6">
      <button
        type="button"
        @click="tpStore.chooseAndOpenFile"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow transition-colors cursor-pointer flex items-center gap-2"
      >
        <SvgIcon icon="ri:folder-open-line" class="text-14px" />
        打开本地测试 JSON 文件
      </button>
    </div>

    <!-- 快捷键指南 -->
    <div class="w-full max-w-sm border border-[#2d2d2d] rounded-lg p-3 bg-[#1e1e1e]/60">
      <div class="text-10px uppercase font-mono text-gray-500 mb-2 font-bold tracking-wider">常用快捷键</div>
      <div class="space-y-1.5 text-xs font-mono">
        <div v-for="sc in shortcuts" :key="sc.key" class="flex justify-between items-center text-gray-400">
          <span class="text-11px text-gray-500">{{ sc.desc }}</span>
          <kbd class="px-1.5 py-0.5 rounded bg-[#252526] border border-[#3e3e42] text-10px text-gray-300">{{ sc.key }}</kbd>
        </div>
      </div>
    </div>
  </div>
</template>
