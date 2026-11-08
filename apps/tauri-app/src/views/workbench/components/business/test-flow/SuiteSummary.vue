<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import {
  NButton,
  NCard,
  NCollapseTransition,
  NEmpty,
  NGi,
  NGrid,
  NSpace,
  NStatistic,
  NTable,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { computed, ref } from 'vue'

defineOptions({
  name: 'SuiteSummary',
})

const props = defineProps<{
  data?: Record<string, any>
  dataPath?: (string | number)[]
}>()

const message = useMessage()
const showRawJson = ref(false)

const suite = computed(() => props.data || {})

const items = computed<any[]>(() => {
  if (Array.isArray(suite.value.items))
    return suite.value.items
  if (Array.isArray(suite.value.testSuites))
    return suite.value.testSuites
  return []
})

/** 统计不同测试类型的数量 */
const typeDistribution = computed(() => {
  const counts: Record<string, number> = {}
  for (const item of items.value) {
    const type = item.testType || item.type || 'Generic'
    counts[type] = (counts[type] || 0) + 1
  }
  return counts
})

/** 获取类型对应的标签颜色 */
function getTypeTagType(type: string): 'info' | 'success' | 'warning' | 'error' | 'default' {
  switch (type?.toLowerCase()) {
    case 'continuity':
      return 'info'
    case 'iddq':
      return 'success'
    case 'pmuforce':
      return 'warning'
    default:
      return 'default'
  }
}

async function handleCopyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(suite.value, null, 2))
    message.success('测试套件 JSON 已复制到剪贴板')
  }
  catch {
    message.error('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <div class="business-editor-container max-w-5xl select-text p-6 text-gray-200">
    <!-- 头部卡片与标题栏 -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#2d2d2d] pb-4">
      <div class="flex items-center gap-3.5">
        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-8px bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30 transition-transform duration-300 hover:scale-105">
          <SvgIcon icon="ri:function-line" class="text-20px" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-16px text-white font-bold tracking-wide">
              {{ suite.name || '测试套件总览 (Suite Summary)' }}
            </h2>
            <NTag type="primary" size="small" round :bordered="false" class="font-mono">
              Test Suite
            </NTag>
          </div>
          <p class="mt-0.5 text-12px text-gray-400">
            {{ suite.description || 'ATE 自动化测试程序套件执行流程与集合' }}
          </p>
        </div>
      </div>

      <!-- 右上角操作按钮 -->
      <NSpace align="center" :size="8">
        <NButton
          size="small"
          quaternary
          :type="showRawJson ? 'primary' : 'default'"
          class="transition-all duration-200"
          @click="showRawJson = !showRawJson"
        >
          <template #icon>
            <SvgIcon :icon="showRawJson ? 'ri:code-s-slash-line' : 'ri:code-s-line'" />
          </template>
          {{ showRawJson ? '收起底层 JSON' : '查看底层 JSON' }}
        </NButton>
      </NSpace>
    </div>

    <!-- 核心指标统计卡片 -->
    <NGrid cols="1 s:2 m:3" :x-gap="16" :y-gap="16" class="mb-5">
      <NGi>
        <NCard
          size="small"
          class="metric-card border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-cyan-500/40 hover:bg-[#252528]"
        >
          <NStatistic label="测试项总数 (Items Count)">
            <template #prefix>
              <SvgIcon icon="ri:list-check-2" class="mr-1 text-cyan-400" />
            </template>
            <span class="text-white font-mono font-bold">{{ items.length }}</span>
          </NStatistic>
        </NCard>
      </NGi>

      <NGi>
        <NCard
          size="small"
          class="metric-card border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-blue-500/40 hover:bg-[#252528]"
        >
          <NStatistic label="测试类型覆盖 (Categories)">
            <template #prefix>
              <SvgIcon icon="ri:pie-chart-line" class="mr-1 text-blue-400" />
            </template>
            <span class="text-white font-mono font-bold">{{ Object.keys(typeDistribution).length }}</span>
          </NStatistic>
        </NCard>
      </NGi>

      <NGi>
        <NCard
          size="small"
          class="metric-card border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-emerald-500/40 hover:bg-[#252528]"
        >
          <NStatistic label="状态就绪 (Ready Status)">
            <template #prefix>
              <SvgIcon icon="ri:checkbox-circle-line" class="mr-1 text-emerald-400" />
            </template>
            <span class="text-emerald-400 font-mono font-bold">100% OK</span>
          </NStatistic>
        </NCard>
      </NGi>
    </NGrid>

    <!-- 测试项表格卡片 -->
    <NCard
      size="small"
      class="editor-card mb-5 border border-[#2d2d2d] rounded-8px bg-[#222222]/80 transition-all duration-300 hover:border-[#3e3e42]"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-13px text-gray-300 font-semibold">包含的子测试项列表</span>
          <span class="text-11px text-gray-500">共 {{ items.length }} 个测试子单元</span>
        </div>

        <div class="flex items-center gap-1.5">
          <NTag
            v-for="(count, type) in typeDistribution"
            :key="type"
            size="tiny"
            round
            :type="getTypeTagType(String(type))"
            class="font-mono"
          >
            {{ type }}: {{ count }}
          </NTag>
        </div>
      </div>

      <div v-if="items.length === 0" class="py-8">
        <NEmpty description="当前套件下无测试子项" />
      </div>

      <div v-else class="overflow-x-auto rounded-6px border border-[#2d2d2d]">
        <NTable size="small" :single-line="false" class="business-table">
          <thead>
            <tr class="bg-[#2a2a2c] text-gray-400 text-11px font-semibold">
              <th class="w-16">
                编号
              </th>
              <th>测试项名称</th>
              <th class="w-28">
                测试类型
              </th>
              <th>关键参数 / 激励</th>
              <th>门限上下限</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(it, idx) in items"
              :key="it.id || idx"
              class="table-row-hover transition-colors duration-150"
            >
              <td class="font-mono text-11px text-gray-400">
                {{ it.id || `#${idx + 1}` }}
              </td>
              <td class="font-medium text-white">
                {{ it.name || it.testName || '-' }}
              </td>
              <td>
                <NTag size="tiny" round :type="getTypeTagType(it.testType)">
                  {{ it.testType || 'General' }}
                </NTag>
              </td>
              <td class="font-mono text-11px text-gray-300">
                <span v-if="it.forceCurrent !== undefined">Force: {{ it.forceCurrent }} mA</span>
                <span v-else-if="it.forceValue !== undefined">Force: {{ it.forceValue }} {{ it.unit || 'V' }}</span>
                <span v-else-if="it.vccVolt !== undefined">VDD: {{ it.vccVolt }} V</span>
                <span v-else>-</span>
              </td>
              <td class="font-mono text-11px text-gray-400">
                <span v-if="it.loLimit !== undefined || it.hiLimit !== undefined">
                  [{{ it.loLimit ?? '-' }}, {{ it.hiLimit ?? '-' }}] {{ it.unit || 'V' }}
                </span>
                <span v-else-if="it.maxCurrentUa !== undefined">
                  Max: {{ it.maxCurrentUa }} µA
                </span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </NTable>
      </div>
    </NCard>

    <!-- 底层 JSON 展开抽屉（带有平滑折叠展开动画） -->
    <NCollapseTransition :show="showRawJson">
      <div class="mt-4 border border-[#333333] rounded-8px bg-[#181818] p-4 shadow-xl transition-all duration-300">
        <div class="mb-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span class="text-12px text-gray-300 font-mono font-medium">底层原始数据结构 (Live Sync)</span>
          </div>
          <NButton size="tiny" secondary type="primary" @click="handleCopyJson">
            <template #icon>
              <SvgIcon icon="ri:file-copy-line" />
            </template>
            复制代码
          </NButton>
        </div>
        <pre class="max-h-64 overflow-auto rounded-6px bg-black/60 p-3.5 text-11px text-emerald-400/90 font-mono leading-relaxed select-all">{{ JSON.stringify(suite, null, 2) }}</pre>
      </div>
    </NCollapseTransition>
  </div>
</template>

<style scoped>
.business-editor-container {
  animation: fadeInSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInSlideUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.metric-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.table-row-hover:hover {
  background-color: rgba(255, 255, 255, 0.04);
}
</style>
