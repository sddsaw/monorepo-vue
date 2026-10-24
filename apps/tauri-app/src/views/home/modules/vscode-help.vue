<script setup lang="ts">
import { useMessage } from 'naive-ui'

defineOptions({
  name: 'VscodeHelp',
})

const message = useMessage()

interface HelpItem {
  id: string
  title: string
  desc: string
  icon: string
  url?: string
}

const helpItems: HelpItem[] = [
  {
    id: 'doc',
    title: '官方文档',
    desc: '查阅框架核心 API 与组件库指南',
    icon: '📘',
    url: 'https://github.com/soybeanjs/soybean-admin',
  },
  {
    id: 'notes',
    title: '发行说明',
    desc: '查看 v2.3.1 最新版本发布日志',
    icon: '📝',
  },
  {
    id: 'shortcuts',
    title: '快捷键速查表',
    desc: '获取针对 Mac 与 Windows 的 PDF 键位图',
    icon: '⌨️',
  },
  {
    id: 'github',
    title: 'GitHub 开源仓库',
    desc: '提交 Issue、查看源码与参与社区共建',
    icon: '🐙',
    url: 'https://github.com/soybeanjs/soybean-admin',
  },
  {
    id: 'tips',
    title: '提示与技巧',
    desc: '探索高效开发、多光标编辑与调试技巧',
    icon: '💡',
  },
  {
    id: 'community',
    title: '开发者社区',
    desc: '加入交流讨论与获取技术解答',
    icon: '💬',
  },
]

function handleHelpClick(item: HelpItem) {
  if (item.url) {
    window.open(item.url, '_blank')
  }
  else {
    message.info(`已查看「${item.title}」`)
  }
}
</script>

<template>
  <div class="vscode-help mt-6 flex flex-col">
    <div class="section-title mb-3 flex items-center gap-2 text-16px text-[#e0e0e0] font-semibold">
      <span class="text-[#007acc]">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>
      <span>帮助与资源</span>
    </div>

    <!-- 2-column Grid of Resources -->
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div
        v-for="item in helpItems"
        :key="item.id"
        class="group flex cursor-pointer items-start gap-2.5 border border-[#2d2d2d] rounded bg-[#1f1f1f] p-2.5 transition-all hover:border-[#3e3e42] hover:bg-[#2a2d2e]"
        @click="handleHelpClick(item)"
      >
        <span class="mt-0.5 shrink-0 text-16px">{{ item.icon }}</span>
        <div class="min-w-0 flex flex-col">
          <span class="truncate text-12px text-[#cccccc] font-medium transition-colors group-hover:text-[#4daafc]">
            {{ item.title }}
          </span>
          <span class="line-clamp-1 mt-0.5 text-11px text-[#757575]">
            {{ item.desc }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vscode-help {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
</style>
