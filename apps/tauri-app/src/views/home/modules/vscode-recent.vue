<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'VscodeRecent',
})

const message = useMessage()
const router = useRouter()

interface RecentItem {
  id: string
  name: string
  path: string
  timeAgo: string
  pinned: boolean
  tag?: string
  route?: string
}

const recentList = ref<RecentItem[]>([
  {
    id: '1',
    name: 'monorepo-vue',
    path: '/Users/zhouenbo/monorepo-vue',
    timeAgo: '刚刚',
    pinned: true,
    tag: 'Workspace',
    route: '/home',
  },
  {
    id: '2',
    name: 'tauri-app',
    path: 'monorepo-vue/apps/tauri-app',
    timeAgo: '10 分钟前',
    pinned: true,
    tag: 'Desktop',
    route: '/desktop',
  },
  {
    id: '3',
    name: 'admin',
    path: 'monorepo-vue/apps/admin',
    timeAgo: '2 小时前',
    pinned: false,
    tag: 'Web App',
    route: '/demo',
  },
  {
    id: '4',
    name: 'packages/components',
    path: 'monorepo-vue/packages/components',
    timeAgo: '昨天',
    pinned: false,
    tag: 'Package',
  },
  {
    id: '5',
    name: 'packages/hooks',
    path: 'monorepo-vue/packages/hooks',
    timeAgo: '3 天前',
    pinned: false,
    tag: 'Package',
  },
])

const filterQuery = ref('')

const filteredList = computed(() => {
  const query = filterQuery.value.trim().toLowerCase()
  if (!query)
    return recentList.value
  return recentList.value.filter(
    item => item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query),
  )
})

function handleOpenRecent(item: RecentItem) {
  if (item.route) {
    router.push(item.route)
  }
  else {
    message.info(`已切换工作空间: ${item.name} (${item.path})`)
  }
}

function togglePin(item: RecentItem, e: MouseEvent) {
  e.stopPropagation()
  item.pinned = !item.pinned
  message.success(item.pinned ? `已固定「${item.name}」` : `已取消固定「${item.name}」`)
}

function removeRecent(item: RecentItem, e: MouseEvent) {
  e.stopPropagation()
  recentList.value = recentList.value.filter(i => i.id !== item.id)
  message.info(`已从最近项移除「${item.name}」`)
}

function handleMoreRecent() {
  message.info('已加载全部工作区历史记录')
}
</script>

<template>
  <div class="vscode-recent mt-6 flex flex-col">
    <div class="mb-3 flex items-center justify-between">
      <div class="section-title flex items-center gap-2 text-16px text-[#e0e0e0] font-semibold">
        <span class="text-[#007acc]">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <span>最近打开</span>
      </div>

      <!-- Quick Filter -->
      <div class="relative w-36">
        <input
          v-model="filterQuery"
          type="text"
          placeholder="筛选最近项..."
          class="w-full border border-[#3c3c3c] rounded bg-[#252526] px-2 py-1 text-12px text-[#cccccc] outline-none transition-colors focus:border-[#007acc]"
        >
      </div>
    </div>

    <!-- Recent List -->
    <div class="recent-list flex flex-col gap-1">
      <div
        v-for="item in filteredList"
        :key="item.id"
        class="recent-item group flex cursor-pointer items-center justify-between rounded bg-transparent px-3 py-2 text-left transition-colors hover:bg-[#2a2d2e]"
        @click="handleOpenRecent(item)"
      >
        <div class="min-w-0 flex items-center gap-3">
          <!-- Folder Icon -->
          <span class="shrink-0 text-[#e8a838]">
            <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </span>

          <div class="min-w-0 flex flex-col">
            <div class="flex items-center gap-2">
              <span class="truncate text-13px text-[#e0e0e0] font-medium transition-colors group-hover:text-[#4daafc]">
                {{ item.name }}
              </span>
              <span
                v-if="item.tag"
                class="border border-[#444444] rounded bg-[#333333] px-1.5 py-0.2 text-10px text-[#999999]"
              >
                {{ item.tag }}
              </span>
            </div>
            <span class="mt-0.5 truncate text-11px text-[#757575] font-mono">
              {{ item.path }}
            </span>
          </div>
        </div>

        <!-- Right Side: Time and Action Icons -->
        <div class="ml-2 flex shrink-0 items-center gap-2">
          <span class="text-11px text-[#666666] group-hover:hidden">
            {{ item.timeAgo }}
          </span>

          <div class="hidden items-center gap-1 group-hover:flex">
            <!-- Pin Button -->
            <button
              class="cursor-pointer border-0 rounded bg-transparent p-1 text-[#888888] transition-colors hover:text-[#e0e0e0]"
              :title="item.pinned ? '取消固定' : '固定'"
              @click="togglePin(item, $event)"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                :fill="item.pinned ? '#007acc' : 'none'"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 2v8m0 0l-3 4h6l-3-4zm0 8v4m-5-8h10" />
              </svg>
            </button>

            <!-- Remove Button -->
            <button
              class="cursor-pointer border-0 rounded bg-transparent p-1 text-[#888888] transition-colors hover:text-[#f14c4c]"
              title="从最近项中移除"
              @click="removeRecent(item, $event)"
            >
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredList.length === 0" class="py-3 text-center text-12px text-[#777]">
        无匹配的最近项目
      </div>
    </div>

    <!-- More Button -->
    <button
      class="mt-2 cursor-pointer border-0 bg-transparent px-3 py-1.5 text-left text-12px text-[#007acc] transition-colors hover:text-[#4daafc]"
      @click="handleMoreRecent"
    >
      更多...
    </button>
  </div>
</template>

<style scoped>
.vscode-recent {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
</style>
