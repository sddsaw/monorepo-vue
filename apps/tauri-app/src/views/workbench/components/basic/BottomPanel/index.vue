<script setup lang="ts">
import {
  NBadge,
  NButton,
  NEmpty,
  NScrollbar,
  NTabPane,
  NTabs,
  NTag,
  NTooltip,
} from 'naive-ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ResizeHandle from '@/components/common/ResizeHandle.vue'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import OutputTerminal from './components/OutputTerminal.vue'
import { generateBulkLogs, startMockLogStream } from './mockLog'

defineOptions({
  name: 'BottomPanel',
})

const tpStore = useTpStore()
const layoutStore = useWorkbenchLayoutStore()

const activeTab = ref<'problems' | 'logs' | 'output'>('problems')
const panelHeight = ref<number>(180)
const isResizing = ref(false)
const isMaximized = ref(false)
const previousHeight = ref<number>(180)
const logsCleared = ref(false)
const outputTerminalRef = ref<InstanceType<typeof OutputTerminal> | null>(null)

// --- Mock 日志流控制 ---
const isMockStreaming = ref(true)
let stopMockStream: (() => void) | null = null

function toggleMockStream() {
  if (isMockStreaming.value) {
    stopMockStream?.()
    stopMockStream = null
    isMockStreaming.value = false
  }
  else {
    isMockStreaming.value = true
    stopMockStream = startMockLogStream((line) => {
      outputTerminalRef.value?.appendLog(line)
    }, 400)
  }
}

/** 一键灌入 1000 条日志用于性能压测 */
function injectBulkLogs() {
  const bulk = generateBulkLogs(1000)
  bulk.forEach(line => outputTerminalRef.value?.appendLog(line))
}

onMounted(() => {
  // 默认启动 mock 日志推送
  stopMockStream = startMockLogStream((line) => {
    outputTerminalRef.value?.appendLog(line)
  }, 400)
})

onBeforeUnmount(() => {
  stopMockStream?.()
  stopMockStream = null
})

/** 处理拖拽折叠事件 (向下拖拽低于阈值时收起底部面板) */
function handleCollapse() {
  layoutStore.setBottomPanelVisible(false)
  isResizing.value = false
  panelHeight.value = 180
}

/** 折叠状态下向上拖拽或双击手柄时重新展开底部面板 */
function handleExpand() {
  layoutStore.setBottomPanelVisible(true)
}

/** 手动拖拽过程中重置最大化状态 */
function handleResize() {
  if (isMaximized.value) {
    isMaximized.value = false
  }
}

/** 切换最大化与恢复原高度 */
function toggleMaximize() {
  if (isMaximized.value) {
    panelHeight.value = previousHeight.value
    isMaximized.value = false
  }
  else {
    previousHeight.value = panelHeight.value
    panelHeight.value = 400
    isMaximized.value = true
  }
}
</script>

<template>
  <div class="w-full flex flex-col shrink-0">
    <!-- 顶部常驻拖拽调整高度手柄 (展开时向上变大、向下低于阈值折叠；折叠后可向上拖拽或双击重新拉开) -->
    <ResizeHandle
      v-model="panelHeight"
      direction="row"
      :reverse="true"
      :min="100"
      :max="500"
      :collapsed="!layoutStore.bottomPanelVisible"
      :collapse-threshold="80"
      :expand-threshold="30"
      :title="layoutStore.bottomPanelVisible ? '拖拽调节高度 (向下拖拽收起)' : '向上拖拽或双击展开底部面板'"
      @start="isResizing = true"
      @end="isResizing = false"
      @resize="handleResize"
      @collapse="handleCollapse"
      @expand="handleExpand"
      @dblclick="!layoutStore.bottomPanelVisible && handleExpand()"
    />

    <section
      :style="{
        height: layoutStore.bottomPanelVisible ? `${panelHeight}px` : '0px',
        opacity: layoutStore.bottomPanelVisible ? 1 : 0,
        backgroundColor: 'rgb(var(--layout-bg-color))',
        borderColor: 'var(--border-color)',
      }"
      class="z-20 w-full flex flex-col shrink-0 select-none overflow-hidden rounded-[var(--theme-radius)] text-xs"
      :class="[
        layoutStore.bottomPanelVisible && 'mb-4px border',
        !isResizing ? 'transition-[height,opacity] duration-220 ease-[cubic-bezier(0.25,1,0.5,1)]' : '',
      ]"
    >
      <!-- 内部固定高度容器，防止折叠动画时选项卡与内容挤压变形 -->
      <div
        :style="{ height: `${panelHeight}px` }"
        class="min-h-0 flex flex-col shrink-0 overflow-hidden"
      >
        <NTabs
          v-model:value="activeTab"
          type="line"
          size="small"
          class="bottom-panel-tabs h-full flex flex-col"
          pane-wrapper-class="flex-1 min-h-0 overflow-hidden"
          pane-class="h-full !p-0"
        >
          <!-- 1. 问题 (Problems) 标签页 -->
          <NTabPane name="problems">
            <template #tab>
              <div class="flex items-center gap-1.5 py-0.5">
                <SvgIcon icon="ri:error-warning-line" class="text-ui-13" />
                <span>问题 (Problems)</span>
                <NBadge
                  :value="tpStore.validationResult.errors.length"
                  :type="tpStore.validationResult.errors.length > 0 ? 'error' : 'default'"
                  :color="tpStore.validationResult.errors.length > 0 ? undefined : 'var(--hover-color)'"
                  :show-zero="true"
                  size="small"
                />
              </div>
            </template>

            <NScrollbar class="h-full">
              <div class="p-3 text-xs font-mono">
                <!-- 无问题状态：NEmpty 展示成功反馈 -->
                <div v-if="tpStore.validationResult.errors.length === 0" class="py-6">
                  <NEmpty description="当前测试程序未检测到 DRC 规则或上下限错误" size="small">
                    <template #icon>
                      <SvgIcon icon="ri:checkbox-circle-line" class="text-success text-ui-28" />
                    </template>
                    <template #extra>
                      <NButton size="tiny" quaternary class="text-xs" @click="tpStore.runValidation()">
                        <template #icon>
                          <SvgIcon icon="ri:refresh-line" class="text-ui-12" />
                        </template>
                        重新校验 DRC
                      </NButton>
                    </template>
                  </NEmpty>
                </div>

                <!-- 存在校验错误：列表化展示 -->
                <div v-else class="select-text space-y-1.5">
                  <div
                    v-for="(err, idx) in tpStore.validationResult.errors"
                    :key="idx"
                    class="group flex cursor-pointer items-start gap-2.5 border border-transparent rounded p-2 transition-colors hover:border-error/40 hover:bg-error/25"
                  >
                    <SvgIcon icon="ri:close-circle-fill" class="mt-0.5 shrink-0 text-error text-ui-15" />
                    <span class="flex-1 select-text text-error leading-relaxed">{{ err }}</span>
                    <NTag type="error" size="tiny" :bordered="false" class="shrink-0 font-mono text-ui-10">
                      DRC
                    </NTag>
                  </div>
                </div>
              </div>
            </NScrollbar>
          </NTabPane>

          <!-- 2. 本地日志 (Logs) 标签页 -->
          <NTabPane name="logs">
            <template #tab>
              <div class="flex items-center gap-1.5 py-0.5">
                <SvgIcon icon="ri:file-list-3-line" class="text-ui-13" />
                <span>本地日志 (Logs)</span>
              </div>
            </template>

            <NScrollbar class="h-full">
              <div class="select-text p-3 text-xs text-base-text font-mono space-y-2">
                <div v-if="logsCleared" class="py-4 text-center text-[var(--text-muted)] italic">
                  日志已清空
                </div>
                <template v-else>
                  <div class="flex items-start gap-2 text-[var(--text-muted)]">
                    <NTag size="tiny" type="info" :bordered="false" class="shrink-0 font-mono text-ui-10">
                      INFO
                    </NTag>
                    <span class="text-[var(--text-muted)]">ATE Studio 日志系统就绪，已关联本地 rolling app.log</span>
                  </div>
                  <div v-if="tpStore.fileName" class="flex items-start gap-2">
                    <NTag size="tiny" type="info" :bordered="false" class="shrink-0 font-mono text-ui-10">
                      INFO
                    </NTag>
                    <span class="text-primary">已加载测试程序: {{ tpStore.filePath }}</span>
                  </div>
                  <div v-if="tpStore.isDirty" class="flex items-start gap-2">
                    <NTag size="tiny" type="warning" :bordered="false" class="shrink-0 font-mono text-ui-10">
                      WARN
                    </NTag>
                    <span class="text-warning">检测到未保存的脏数据修改</span>
                  </div>
                </template>
              </div>
            </NScrollbar>
          </NTabPane>

          <!-- 3. 输出 (Output) 标签页 -->
          <NTabPane name="output">
            <template #tab>
              <div class="flex items-center gap-1.5 py-0.5">
                <SvgIcon icon="ri:terminal-box-line" class="text-ui-13" />
                <span>输出 (Output)</span>
              </div>
            </template>

            <OutputTerminal
              ref="outputTerminalRef"
              :active-tab="activeTab"
              :is-resizing="isResizing"
              :adapter-name="tpStore.activeAdapter?.name"
              :active-tabs-count="tpStore.tabs.length"
            />
          </NTabPane>

          <!-- 选项卡右侧操作区 (Suffix Slot) -->
          <template #suffix>
            <div class="flex items-center gap-1 pr-2">
              <!-- 重新校验 DRC -->
              <NTooltip v-if="activeTab === 'problems'" placement="top" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="text-[var(--text-muted)] !h-22px !w-22px !p-0 hover:text-base-text"
                    @click="tpStore.runValidation()"
                  >
                    <template #icon>
                      <SvgIcon icon="ri:refresh-line" class="text-ui-13" />
                    </template>
                  </NButton>
                </template>
                <span>重新执行 DRC 校验</span>
              </NTooltip>

              <!-- 清空日志 -->
              <NTooltip v-if="activeTab === 'logs'" placement="top" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="text-[var(--text-muted)] !h-22px !w-22px !p-0 hover:text-base-text"
                    @click="logsCleared = true"
                  >
                    <template #icon>
                      <SvgIcon icon="ri:delete-bin-line" class="text-ui-13" />
                    </template>
                  </NButton>
                </template>
                <span>清空日志</span>
              </NTooltip>

              <!-- 模拟推流控制 (播放 / 暂停) -->
              <NTooltip v-if="activeTab === 'output'" placement="top" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    :class="isMockStreaming ? 'text-success hover:text-success' : 'text-[var(--text-muted)] hover:text-base-text'"
                    class="!h-22px !w-22px !p-0"
                    @click="toggleMockStream"
                  >
                    <template #icon>
                      <SvgIcon :icon="isMockStreaming ? 'ri:pause-line' : 'ri:play-line'" class="text-ui-13" />
                    </template>
                  </NButton>
                </template>
                <span>{{ isMockStreaming ? '暂停模拟日志推流' : '恢复模拟日志推流' }}</span>
              </NTooltip>

              <!-- 一键压测注入 1000 条 -->
              <NTooltip v-if="activeTab === 'output'" placement="top" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="text-warning !h-22px !w-22px !p-0 hover:text-warning"
                    @click="injectBulkLogs"
                  >
                    <template #icon>
                      <SvgIcon icon="ri:flashlight-line" class="text-ui-13" />
                    </template>
                  </NButton>
                </template>
                <span>灌入 1,000 条日志 (性能压测)</span>
              </NTooltip>

              <!-- 清空输出 (Output) -->
              <NTooltip v-if="activeTab === 'output'" placement="top" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="text-[var(--text-muted)] !h-22px !w-22px !p-0 hover:text-base-text"
                    @click="outputTerminalRef?.clearLog()"
                  >
                    <template #icon>
                      <SvgIcon icon="ri:delete-bin-line" class="text-ui-13" />
                    </template>
                  </NButton>
                </template>
                <span>清空输出</span>
              </NTooltip>

              <!-- 最大化 / 还原切换 -->
              <NTooltip placement="top" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="text-[var(--text-muted)] !h-22px !w-22px !p-0 hover:text-base-text"
                    @click="toggleMaximize"
                  >
                    <template #icon>
                      <SvgIcon
                        :icon="isMaximized ? 'ri:contract-up-down-line' : 'ri:expand-up-down-line'"
                        class="text-ui-13"
                      />
                    </template>
                  </NButton>
                </template>
                <span>{{ isMaximized ? '还原面板大小' : '最大化面板' }}</span>
              </NTooltip>

              <!-- 关闭面板 (Ctrl+J) -->
              <NTooltip placement="top" trigger="hover">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="text-[var(--text-muted)] !h-22px !w-22px !p-0 hover:text-base-text"
                    @click="layoutStore.setBottomPanelVisible(false)"
                  >
                    <template #icon>
                      <SvgIcon icon="ri:close-line" class="text-ui-14" />
                    </template>
                  </NButton>
                </template>
                <span>关闭面板 (Ctrl+J)</span>
              </NTooltip>
            </div>
          </template>
        </NTabs>
      </div>
    </section>
  </div>
</template>

<style scoped>
:deep(.n-tabs-nav) {
  background-color: rgb(var(--layout-bg-color));
  border-bottom: 1px solid var(--border-color);
  padding: 0 8px;
}

:deep(.n-tabs-nav-scroll-content) {
  gap: 8px;
}

:deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
}

:deep(.n-tab-pane) {
  height: 100%;
  box-sizing: border-box;
}
</style>
