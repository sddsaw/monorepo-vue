<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { NButton, NInput, NModal, NSelect, NTag, NTooltip } from 'naive-ui'
import { ref } from 'vue'
import ProximaLogo from '@/components/common/ProximaLogo.vue'
import { useProjectNavigation } from '@/hooks/business/project'
import { isTauri } from '@/plugins/tauri'
import { useTpStore } from '@/store/modules/tp'
import WindowTitleBar from '@/views/workbench/components/basic/WindowTitleBar/index.vue'

defineOptions({
  name: 'ProjectView',
})

const tpStore = useTpStore()
const { openProject, openProjectDirectory } = useProjectNavigation()

// ─── 弹窗控制状态 ───
const showNewProjectModal = ref(false)
const showMaintenanceModal = ref(false)
const showClusterModal = ref(false)
const copySuccessPath = ref<string | null>(null)

// ─── 新建工程表单 ───
const newProjectForm = ref({
  name: 'TP_Proxima_ATE_01',
  template: 'ATE_Digital',
})

const templateOptions = [
  { label: 'ATE Digital Logic Checker (数字逻辑验证)', value: 'ATE_Digital' },
  { label: 'MIO Mixed Signal Calibration (数模混合校准)', value: 'MIO_Cal' },
  { label: 'PMIC Multi-Site Voltage Profile (多通道供电分析)', value: 'PMIC_Multi' },
  { label: 'Offline Pattern Visualizer (离线波形可视化)', value: 'Offline_Visualizer' },
]

function handleCreateProject() {
  showNewProjectModal.value = false
  openProject()
}

// ─── 路径复制处理 ───
async function handleCopyPath(path: string) {
  try {
    await navigator.clipboard.writeText(path)
    copySuccessPath.value = path
    setTimeout(() => {
      if (copySuccessPath.value === path) {
        copySuccessPath.value = null
      }
    }, 2000)
    window.$message?.success('工程绝对路径已复制到剪切板')
  }
  catch {
    window.$message?.info(`路径: ${path}`)
  }
}

// ─── 维护与集群 Mock 数据 ───
const clusterStations = [
  { id: 'ATE-01', name: 'TSMC_7nm_Production_Line_A', ip: '192.168.1.101', status: 'running', statusText: '运行中' },
  { id: 'ATE-02', name: 'MIO_Mixed_Signal_Cal_Rig', ip: '192.168.1.102', status: 'standby', statusText: '待机就绪' },
  { id: 'ATE-03', name: 'PMIC_High_Voltage_Station', ip: '192.168.1.103', status: 'standby', statusText: '待机就绪' },
  { id: 'ATE-04', name: 'RF_FrontEnd_Validation_Lab', ip: '192.168.1.104', status: 'running', statusText: '运行中' },
]

const calibrationMetrics = [
  { label: 'ADC 电压偏置偏离', value: '+0.038 mV', status: 'good' },
  { label: '时钟相位抖动 (Clock Jitter)', value: '< 1.18 ps', status: 'good' },
  { label: '64 通道数字 IO 环回阻抗', value: '50.12 Ω 标称', status: 'good' },
  { label: '继电器寿命诊断 (Cycle Count)', value: '98.5% 健康', status: 'good' },
]
</script>

<template>
  <div class="proxima-home-container">
    <!-- 顶部原生工控风格标题栏 -->
    <WindowTitleBar
      :menus="[]"
      :show-search="false"
      :show-toolbar="false"
      :show-layout-controls="false"
      :show-adapter-status="false"
      class="proxima-titlebar-wrapper"
    />

    <!-- 主视口内容区 -->
    <main class="proxima-main-viewport">
      <div class="proxima-main-content">
        <!-- 1. Hero 品牌与标志区域 -->
        <header class="hero-brand-section">
          <div class="hero-logo-box">
            <ProximaLogo :size="76" :show-shadow="true" />
          </div>
          <div class="hero-text-box">
            <h1 class="brand-title">
              Proxima
            </h1>
            <p class="brand-subtitle">
              SEMICONDUCTOR TEST PLATFORM
            </p>
          </div>
        </header>

        <!-- 2. 四大核心操作入口卡片 -->
        <section class="action-cards-row" aria-label="核心操作入口">
          <!-- New Project 新建工程 -->
          <button
            type="button"
            class="action-card card-new-project card-anim-0"
            :disabled="tpStore.projectBusy"
            @click="showNewProjectModal = true"
          >
            <div class="card-icon-wrapper">
              <SvgIcon icon="ri:file-add-line" class="card-icon-svg" />
            </div>
            <span class="card-label">New Project</span>
          </button>

          <!-- Open Project 打开工程 -->
          <button
            type="button"
            class="action-card card-secondary card-anim-1"
            :disabled="tpStore.projectBusy"
            @click="openProject()"
          >
            <div class="card-icon-wrapper">
              <SvgIcon icon="ri:folder-open-line" class="card-icon-svg" />
            </div>
            <span class="card-label">Open Project</span>
          </button>

          <!-- Maintenance 维护校准入口 -->
          <button
            type="button"
            class="action-card card-secondary card-anim-2"
            :disabled="tpStore.projectBusy"
            @click="showMaintenanceModal = true"
          >
            <div class="card-icon-wrapper">
              <SvgIcon icon="ri:tools-line" class="card-icon-svg wrench-icon" />
            </div>
            <span class="card-label">Maintenance</span>
          </button>

          <!-- Cluster Master 集群总控 -->
          <button
            type="button"
            class="action-card card-secondary card-anim-3"
            :disabled="tpStore.projectBusy"
            @click="showClusterModal = true"
          >
            <div class="card-icon-wrapper">
              <SvgIcon icon="ri:node-tree" class="card-icon-svg" />
            </div>
            <span class="card-label">Cluster Master</span>
          </button>
        </section>

        <!-- 浏览器多文件工程预览目录选择提示 -->
        <div v-if="!isTauri()" class="web-preview-tip">
          <NButton
            size="tiny"
            quaternary
            class="web-dir-btn"
            :disabled="tpStore.projectBusy"
            @click="openProjectDirectory"
          >
            <template #icon>
              <SvgIcon icon="ri:folder-shared-line" />
            </template>
            选择多文件工程目录
          </NButton>
          <span class="tip-text">浏览器环境测试多文件工程时，可直接载入包含 .prx 与配置文件的目录。</span>
        </div>

        <!-- 3. 最近工程列表面板 (RECENT PROJECTS) -->
        <section class="recent-projects-panel" aria-labelledby="recent-projects-heading">
          <div class="panel-header">
            <span id="recent-projects-heading" class="panel-title">RECENT PROJECTS</span>
            <span class="project-count-badge">{{ tpStore.recentProjects.length }} 项</span>
          </div>

          <div class="project-list-container">
            <div v-if="tpStore.recentProjects.length === 0" class="empty-recent-state">
              <SvgIcon icon="ri:inbox-line" class="mb-8px text-32px text-gray-500 opacity-60" />
              <p>暂无最近工程。点击 <strong class="text-sky-400 font-medium">Open Project</strong> 选择本地 .prx 测试程序开始。</p>
            </div>

            <div
              v-for="(project, index) in tpStore.recentProjects"
              v-else
              :key="project.path"
              class="project-item-row history-item-anim"
              :style="{ animationDelay: `${0.28 + index * 0.05}s` }"
              @click="openProject(project.path)"
            >
              <!-- 左侧文件图标 -->
              <div class="project-icon-box">
                <SvgIcon icon="ri:file-code-line" class="project-file-svg" />
              </div>

              <!-- 中间项目名与路径 -->
              <div class="project-info-box">
                <div class="project-name" :title="project.name">
                  {{ project.name }}
                </div>
                <div class="project-path" :title="project.path">
                  {{ project.path }}
                </div>
              </div>

              <!-- 右侧时间戳与快捷悬浮工具栏 -->
              <div class="project-meta-box">
                <span class="project-date">{{ project.lastOpened }}</span>
                <div class="project-hover-tools" @click.stop>
                  <NTooltip trigger="hover" placement="top">
                    <template #trigger>
                      <button
                        type="button"
                        class="tool-mini-btn"
                        :class="{ 'copied-btn': copySuccessPath === project.path }"
                        aria-label="复制工程路径"
                        @click="handleCopyPath(project.path)"
                      >
                        <SvgIcon
                          :icon="copySuccessPath === project.path ? 'ri:check-line' : 'ri:file-copy-line'"
                          class="text-12px"
                        />
                      </button>
                    </template>
                    {{ copySuccessPath === project.path ? '已复制路径' : '复制工程绝对路径' }}
                  </NTooltip>

                  <NTooltip trigger="hover" placement="top">
                    <template #trigger>
                      <button
                        type="button"
                        class="tool-mini-btn delete-btn"
                        aria-label="从记录移除"
                        @click="tpStore.removeRecentProject(project.path)"
                      >
                        <SvgIcon icon="ri:close-line" class="text-13px" />
                      </button>
                    </template>
                    从最近打开记录中移除
                  </NTooltip>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. 底部状态指示与版本号 -->
        <footer class="proxima-footer">
          <div class="footer-status-pill">
            <span class="status-indicator-dot" />
            <span>{{ tpStore.projectBusy ? '正在载入半导体测试程序…' : '就绪 · 支持 .prx 工业测试程序' }}</span>
          </div>
          <div class="footer-version">
            <span>Proxima ATE Platform · v2.3.1</span>
          </div>
        </footer>
      </div>
    </main>

    <!-- 新建工程模态弹窗 -->
    <NModal
      v-model:show="showNewProjectModal"
      preset="card"
      title="新建 Proxima 半导体测试工程"
      class="proxima-themed-modal !max-w-540px"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <div class="flex flex-col gap-18px py-4px">
        <div>
          <label class="mb-6px block text-12px text-slate-300 font-medium">工程名称 (Project Name)</label>
          <NInput v-model:value="newProjectForm.name" placeholder="例如: TP_MVS_Checker_V2" />
        </div>
        <div>
          <label class="mb-6px block text-12px text-slate-300 font-medium">芯片测试模板类型</label>
          <NSelect v-model:value="newProjectForm.template" :options="templateOptions" />
        </div>
        <div class="border border-white/10 rounded-6px bg-white/[0.03] p-12px text-11px text-slate-400 leading-relaxed">
          <span class="text-slate-200 font-semibold">模板特性：</span>
          内置标准化 Pin Map 引脚映射、电平规格 (Levels & Specs)、测试流程与 DRC 硬件阻抗规则，一键构建工程模板骨架。
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-10px">
          <NButton size="small" quaternary @click="showNewProjectModal = false">
            取消
          </NButton>
          <NButton size="small" type="primary" @click="handleCreateProject">
            创建并载入工程
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 维护与校准模态弹窗 -->
    <NModal
      v-model:show="showMaintenanceModal"
      preset="card"
      title="Proxima 机台维护与硬件校准"
      class="proxima-themed-modal !max-w-560px"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <div class="flex flex-col gap-16px py-4px">
        <div class="grid grid-cols-2 gap-10px">
          <div
            v-for="item in calibrationMetrics"
            :key="item.label"
            class="border border-white/10 rounded-8px bg-white/[0.04] p-12px"
          >
            <div class="mb-4px text-11px text-slate-400">
              {{ item.label }}
            </div>
            <div class="text-14px text-emerald-400 font-semibold font-mono">
              {{ item.value }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-8px border border-emerald-500/20 rounded-6px bg-emerald-500/10 p-12px text-11px text-emerald-300">
          <SvgIcon icon="ri:checkbox-circle-line" class="shrink-0 text-16px text-emerald-400" />
          <span>测试机台 PXIe 接口链路正常，所有驱动与测量通道均通过自检基准校验。</span>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end">
          <NButton size="small" quaternary @click="showMaintenanceModal = false">
            完成
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 集群总控抽屉/弹窗 -->
    <NModal
      v-model:show="showClusterModal"
      preset="card"
      title="Cluster Master 芯片测控集群中控"
      class="proxima-themed-modal !max-w-640px"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <div class="flex flex-col gap-12px py-4px">
        <div class="flex items-center justify-between border-b border-white/10 pb-4px text-12px text-slate-400">
          <span>总控网关: 192.168.1.100 (gRPC Connected)</span>
          <span>在线测控机台: {{ clusterStations.length }} 台</span>
        </div>
        <div class="max-h-240px flex flex-col gap-8px overflow-y-auto">
          <div
            v-for="node in clusterStations"
            :key="node.id"
            class="flex items-center justify-between border border-white/8 rounded-6px bg-white/[0.03] px-12px py-10px transition-colors hover:bg-white/[0.06]"
          >
            <div class="min-w-0 flex items-center gap-10px">
              <span class="rounded-4px bg-sky-500/20 px-6px py-2px text-11px text-sky-400 font-semibold font-mono">{{ node.id }}</span>
              <span class="truncate text-12px text-slate-200 font-medium">{{ node.name }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-12px">
              <span class="text-11px text-slate-400 font-mono">{{ node.ip }}</span>
              <NTag size="tiny" :type="node.status === 'running' ? 'success' : 'info'" :bordered="false">
                {{ node.statusText }}
              </NTag>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end">
          <NButton size="small" type="primary" @click="showClusterModal = false">
            确认
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
/* ─── 1. 全局工控高阶暗调容器 ─── */
.proxima-home-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 50% 28%, #36373d 0%, #29292d 65%, #242427 100%);
  color: #f1f5f9;
  user-select: none;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

/* 顶部标题栏背景融合透明 */
.proxima-titlebar-wrapper {
  background: rgba(32, 32, 36, 0.75) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 主视口居中呈现 */
.proxima-main-viewport {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 20px 48px;
  position: relative;
  overflow-y: auto;
}

.proxima-main-content {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ─── 2. Hero 品牌与标志 ─── */
.hero-brand-section {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 36px;
  margin-top: -16px;
}

.hero-logo-box {
  width: 76px;
  height: 76px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-text-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand-title {
  margin: 0;
  font-size: 44px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.05;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  margin: 6px 0 0 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2.2px;
  color: #9ca3af;
}

/* ─── 3. 四大核心操作入口卡片 ─── */
.action-cards-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 28px;
  width: 100%;
}

.action-card {
  width: 146px;
  height: 106px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
  user-select: none;
  border: 1px solid transparent;
}

.action-card:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

/* 依次级联入场动画 */
@keyframes animation-translateY {
  0% {
    transform: translateY(30px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.card-anim-0 {
  opacity: 0;
  animation: animation-translateY 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0s;
}
.card-anim-1 {
  opacity: 0;
  animation: animation-translateY 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.08s;
}
.card-anim-2 {
  opacity: 0;
  animation: animation-translateY 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.16s;
}
.card-anim-3 {
  opacity: 0;
  animation: animation-translateY 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.24s;
}

/* 悬浮微升与投影质感 */
.action-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
}

.action-card:active {
  transform: translateY(0) scale(0.99);
}

/* New Project 亮蓝高亮按钮 */
.card-new-project {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
}

.card-new-project:hover {
  filter: brightness(1.12);
  box-shadow: 0 14px 30px rgba(14, 165, 233, 0.5);
}

/* Open Project & Maintenance 暗色微磨砂卡片 */
.card-secondary {
  background-color: #3b3c42;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f1f5f9;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.card-secondary:hover {
  background-color: #484a54;
  border-color: rgba(255, 255, 255, 0.32);
}

.card-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon-svg {
  font-size: 30px;
}

.wrench-icon {
  font-size: 28px;
  transform: rotate(-10deg);
}

.card-label {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

/* 浏览器多文件提示 */
.web-preview-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.web-dir-btn {
  color: #93c5fd !important;
  border: 1px solid rgba(147, 197, 253, 0.3) !important;
  background: rgba(14, 165, 233, 0.1) !important;
  border-radius: 6px !important;
  padding: 4px 10px !important;
}

.web-dir-btn:hover {
  background: rgba(14, 165, 233, 0.2) !important;
  color: #ffffff !important;
}

.tip-text {
  font-size: 11px;
  color: #8b92a2;
}

/* ─── 4. 最近工程列表面板 ─── */
.recent-projects-panel {
  width: 100%;
  max-width: 680px;
  background-color: #212126;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 4px;
}

.panel-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.4px;
  color: #8b92a2;
}

.project-count-badge {
  font-size: 11px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
}

.project-list-container {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 270px;
  overflow-y: auto;
  padding-right: 2px;
}

.empty-recent-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  font-size: 12px;
  color: #71717a;
  text-align: center;
}

/* 历史列表逐行瀑布动效 */
.history-item-anim {
  opacity: 0;
  animation: animation-translateY 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* 最近工程行项 */
.project-item-row {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.project-item-row:hover {
  background-color: rgba(255, 255, 255, 0.08);
  transform: translateX(6px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
}

.project-icon-box {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  margin-right: 10px;
  flex-shrink: 0;
}

.project-file-svg {
  font-size: 18px;
}

.project-info-box {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.25;
  transition: color 0.15s ease;
}

.project-item-row:hover .project-name {
  color: #38bdf8;
}

.project-path {
  font-size: 11px;
  color: #787e8f;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.project-meta-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 16px;
  flex-shrink: 0;
}

.project-date {
  font-size: 11.5px;
  color: #787e8f;
  font-variant-numeric: tabular-nums;
}

.project-hover-tools {
  display: none;
  align-items: center;
  gap: 5px;
}

.project-item-row:hover .project-hover-tools {
  display: flex;
}

.tool-mini-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #cbd5e1;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-mini-btn:hover {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.tool-mini-btn.copied-btn {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.tool-mini-btn.delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

/* ─── 5. 底部信息栏 ─── */
.proxima-footer {
  width: 100%;
  max-width: 680px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding: 0 4px;
  font-size: 11px;
  color: #646a78;
}

.footer-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.footer-version {
  font-weight: 500;
  letter-spacing: 0.2px;
}

/* 弹窗暗色系风格定制 */
:deep(.proxima-themed-modal) {
  background-color: #212126 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6) !important;
  color: #f1f5f9 !important;
}

:deep(.proxima-themed-modal .n-card-header__main) {
  color: #ffffff !important;
  font-size: 14px !important;
  font-weight: 600 !important;
}

/* 响应式调整 */
@media (max-width: 720px) {
  .action-cards-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .action-card {
    width: 100%;
    height: 96px;
  }
  .project-date {
    display: none;
  }
}
</style>
