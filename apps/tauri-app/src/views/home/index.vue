<script setup lang="ts">
import VscodeFooter from './modules/vscode-footer.vue'
import VscodeHeader from './modules/vscode-header.vue'
import VscodeHelp from './modules/vscode-help.vue'
import VscodeRecent from './modules/vscode-recent.vue'
import VscodeStart from './modules/vscode-start.vue'
import VscodeWalkthroughs from './modules/vscode-walkthroughs.vue'

defineOptions({
  name: 'HomeView',
})
</script>

<template>
  <div class="vscode-welcome-page size-full min-h-[calc(100vh-120px)] flex justify-center overflow-y-auto p-4 md:p-8">
    <div class="welcome-container max-w-1040px w-full flex flex-col justify-between py-2">
      <!-- 1. VS Code Header -->
      <VscodeHeader />

      <!-- 2. Main Content Grid (Two Columns) -->
      <div class="grid grid-cols-1 gap-8 pt-6 md:grid-cols-2 lg:gap-12">
        <!-- Left Column: Start & Recent -->
        <div class="flex flex-col">
          <VscodeStart />
          <VscodeRecent />
        </div>

        <!-- Right Column: Walkthroughs & Help -->
        <div class="flex flex-col">
          <VscodeWalkthroughs />
          <VscodeHelp />
        </div>
      </div>

      <!-- 3. VS Code Footer -->
      <VscodeFooter />
    </div>
  </div>
</template>

<style scoped>
.vscode-welcome-page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #cccccc;
  background-color: #1e1e1e;
}

/* Subtle scrollbar */
.vscode-welcome-page::-webkit-scrollbar {
  width: 8px;
}

.vscode-welcome-page::-webkit-scrollbar-track {
  background: transparent;
}

.vscode-welcome-page::-webkit-scrollbar-thumb {
  background: #3e3e42;
  border-radius: 4px;
}

.vscode-welcome-page::-webkit-scrollbar-thumb:hover {
  background: #505054;
}
</style>
