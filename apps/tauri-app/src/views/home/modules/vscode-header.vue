<script setup lang="ts">
defineOptions({
  name: 'VscodeHeader',
})
</script>

<template>
  <div class="vscode-header flex items-center justify-between border-b border-[#2b2b2b] pb-6 pt-2">
    <div class="flex items-center gap-4">
      <!-- VS Code Iconic Logo SVG -->
      <div class="logo-wrapper relative size-14 flex-center shrink-0">
        <svg
          viewBox="0 0 100 100"
          class="size-full drop-shadow-[0_4px_16px_rgba(0,122,204,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="vscode-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#007acc" />
              <stop offset="100%" stop-color="#0098ff" />
            </linearGradient>
            <linearGradient id="vscode-darkblue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#005a9e" />
              <stop offset="100%" stop-color="#007acc" />
            </linearGradient>
            <linearGradient id="vscode-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1f8ad2" />
              <stop offset="100%" stop-color="#5ec5ff" />
            </linearGradient>
          </defs>
          <!-- Iconic Folded Ribbon Paths of Visual Studio Code -->
          <path
            d="M93.8 20.3L75.6 5.8c-2.3-1.8-5.6-1.5-7.5.7L39.2 38.3 22.8 25.8c-1.8-1.4-4.3-1.4-6.1 0L3.5 35.8c-2.1 1.6-2.5 4.7-.9 6.8l16.1 21.6L2.6 85.8c-1.6 2.1-1.2 5.2.9 6.8l13.2 10c1.8 1.4 4.3 1.4 6.1 0l16.4-12.5 28.9 31.8c1.9 2.2 5.2 2.5 7.5.7l18.2-14.5c2.1-1.7 3.3-4.2 3.3-6.9V27.2c0-2.7-1.2-5.2-3.3-6.9z"
            fill="url(#vscode-blue-grad)"
          />
          <path
            d="M75.6 5.8c-2.3-1.8-5.6-1.5-7.5.7L39.2 38.3l15.3 12.3 24.3-27.2c1.4-1.6 3.4-2.5 5.5-2.5h.3L75.6 5.8z"
            fill="url(#vscode-cyan-grad)"
            opacity="0.85"
          />
          <path
            d="M68.1 98.4c1.9 2.2 5.2 2.5 7.5.7l8.2-6.5V72.1L54.5 50.6 39.2 62.9l28.9 35.5z"
            fill="url(#vscode-darkblue-grad)"
          />
          <path
            d="M22.8 25.8c-1.8-1.4-4.3-1.4-6.1 0L3.5 35.8c-2.1 1.6-2.5 4.7-.9 6.8l16.1 21.6L2.6 85.8c-1.6 2.1-1.2 5.2.9 6.8l13.2 10c1.8 1.4 4.3 1.4 6.1 0l16.4-12.5-12.8-15.8L38.9 62 22.8 25.8z"
            fill="#005a9e"
            opacity="0.6"
          />
        </svg>
      </div>

      <div>
        <div class="flex items-center gap-3">
          <h1 class="m-0 text-28px text-[#e0e0e0] font-semibold tracking-tight">
            Visual Studio Code
          </h1>
          <span class="border border-[#007acc]/40 rounded bg-[#007acc]/20 px-2.5 py-0.5 text-12px text-[#4daafc] font-medium">
            Desktop
          </span>
        </div>
        <p class="mb-0 mt-1 flex items-center gap-2 text-14px text-[#9d9d9d]">
          <span>Code editing. Redefined.</span>
          <span class="inline-block size-1 rounded-full bg-[#555]" />
          <span>代码编辑 · 自由定制 · 原生极速</span>
        </p>
      </div>
    </div>

    <!-- Tech specs / Environment pills -->
    <div class="hidden items-center gap-2.5 text-12px text-[#858585] md:flex">
      <span class="flex items-center gap-1.5 border border-[#333333] rounded bg-[#252526] px-2.5 py-1">
        <span class="size-2 rounded-full bg-[#388a34]" />
        Tauri v2.2.0
      </span>
      <span class="border border-[#333333] rounded bg-[#252526] px-2.5 py-1">
        Vue 3.5
      </span>
      <span class="border border-[#333333] rounded bg-[#252526] px-2.5 py-1">
        UnoCSS
      </span>
    </div>
  </div>
</template>

<style scoped>
.vscode-header {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
</style>
