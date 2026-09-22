<script setup lang="ts">
import { darkTheme } from 'naive-ui'
import { provide, ref, watchEffect } from 'vue'

const isDark = ref(false)

// 响应式切换 HTML 的 dark class
watchEffect(() => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  }
  else {
    document.documentElement.classList.remove('dark')
  }
})

function toggleDark() {
  isDark.value = !isDark.value
}

provide('isDark', isDark)
provide('toggleDark', toggleDark)
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : null" class="h-full w-full">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <div class="h-full w-full flex flex-col overflow-hidden bg-[#f8fafc] text-[#1e293b] dark:bg-[#121214] dark:text-[#f1f5f9]">
            <!-- 全局路由挂载点 -->
            <main class="flex-1 overflow-hidden">
              <RouterView />
            </main>
          </div>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
