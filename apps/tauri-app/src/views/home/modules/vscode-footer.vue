<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { ref } from 'vue'

defineOptions({
  name: 'VscodeFooter',
})

const message = useMessage()
const showOnStartup = ref(true)

function handleCheckboxChange(val: boolean) {
  showOnStartup.value = val
  message.info(val ? '已开启「启动时显示欢迎页面」' : '已关闭「启动时显示欢迎页面」')
}
</script>

<template>
  <div class="vscode-footer mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#2b2b2b] pt-6 text-12px text-[#858585] sm:flex-row">
    <!-- Startup Checkbox -->
    <label class="flex cursor-pointer select-none items-center gap-2 text-[#9d9d9d] transition-colors hover:text-[#cccccc]">
      <input
        type="checkbox"
        :checked="showOnStartup"
        class="size-3.5 cursor-pointer rounded accent-[#007acc]"
        @change="handleCheckboxChange(($event.target as HTMLInputElement).checked)"
      >
      <span>启动时显示欢迎页面 (Show welcome page on startup)</span>
    </label>

    <!-- Hotkey Tips -->
    <div class="flex items-center gap-2 text-11px text-[#757575]">
      <span>按 <kbd class="border border-[#3c3c3c] rounded bg-[#252526] px-1.5 py-0.5 text-[#cccccc] font-mono">⌘⇧P</kbd> 查看所有命令</span>
    </div>
  </div>
</template>

<style scoped>
.vscode-footer {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
</style>
