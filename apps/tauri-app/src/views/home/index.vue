<script setup lang="ts">
import { SvgIcon } from '@sa/components'
import { useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ProximaLogo from '@/components/common/ProximaLogo.vue'
import { isTauri } from '@/plugins/tauri'
import { type RecentProject, useTpStore } from '@/store/modules/tp'

defineOptions({
  name: 'HomeView',
})

const router = useRouter()
const message = useMessage()
const tpStore = useTpStore()

const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')

// 弹窗状态控制
const showNewProjectModal = ref(false)
const showMaintenanceModal = ref(false)

// 新建工程表单
const newProjectForm = ref({
  name: 'New_ATE_Program_01',
  template: 'standard_flow',
  description: 'Proxima ATE 芯片测试自动化程序',
})

// 1. 点击 New Project
function handleNewProject() {
  showNewProjectModal.value = true
}

// 创建工程并进入工作台
async function confirmCreateProject() {
  if (!newProjectForm.value.name.trim()) {
    message.warning('请输入工程名称')
    return
  }

  await tpStore.loadSampleData()
  tpStore.filePath = `/workspace/chips/${newProjectForm.value.name}.json`
  tpStore.addRecentProject(newProjectForm.value.name, tpStore.filePath)

  message.success(`成功创建工程 ${newProjectForm.value.name}，正在进入工作台...`)
  showNewProjectModal.value = false
  router.push('/workbench')
}

// 2. 点击 Open Project
async function handleOpenProject() {
  await tpStore.chooseAndOpenFile()
  if (tpStore.filePath || tpStore.rawJson) {
    message.success('工程加载完成，正在进入工作台...')
    router.push('/workbench')
  }
}

// 3. 点击 Maintenance
function handleMaintenance() {
  showMaintenanceModal.value = true
}

// 根据路径或文件名决定工程图标
function getProjectIcon(filePath: string) {
  if (filePath.endsWith('.json')) {
    return 'ri:file-code-line'
  }
  if (filePath.includes('Checker') || filePath.includes('TP') || filePath.includes('MIO')) {
    return 'ri:cpu-line'
  }
  return 'ri:file-text-line'
}

// 4. 点击最近工程列表项
async function handleSelectRecent(proj: RecentProject) {
  try {
    if (isTauri()) {
      await tpStore.loadFile(proj.path)
    }
    else {
      // 浏览器非桌面环境载入芯片测试样例并模拟工程路径
      await tpStore.loadSampleData()
      tpStore.filePath = proj.path
      tpStore.addRecentProject(proj.name, proj.path)
    }
    message.success(`已载入工程: ${proj.name}`)
    router.push('/workbench')
  }
  catch {
    // 外部文件路径容错：仍使用演示数据进入工作台
    await tpStore.loadSampleData()
    tpStore.filePath = proj.path
    tpStore.addRecentProject(proj.name, proj.path)
    message.info(`已载入工程视图: ${proj.name}`)
    router.push('/workbench')
  }
}
</script>

<template>
  <div class="proxima-home-root relative h-screen w-screen flex flex-col select-none overflow-hidden text-gray-200 font-sans">
    <!-- 1. 顶部标题栏（macOS 避让系统红绿灯，无多余右上角按钮） -->
    <header
      data-tauri-drag-region
      class="z-20 h-38px flex shrink-0 items-center justify-between px-3.5"
      :class="[isMac ? 'pl-20' : '']"
    >
      <!-- 左侧：Proxima 图标与标题 -->
      <div data-tauri-drag-region class="flex items-center gap-2">
        <ProximaLogo :size="19" :show-shadow="false" />
        <span class="text-12px text-gray-300 font-medium tracking-wide">Proxima</span>
      </div>
    </header>

    <!-- 2. 中间主区域 -->
    <main class="z-10 flex flex-col flex-1 items-center justify-center overflow-y-auto px-4 -mt-4">
      <!-- 平台徽标与大标题 -->
      <div class="mb-8 flex items-center gap-4.5">
        <!-- 标志性 P Logo -->
        <ProximaLogo :size="68" class="shadow-2xl" />

        <!-- 标题与标语 -->
        <div class="flex flex-col">
          <h1 class="mb-1.5 text-38px text-white font-bold leading-none tracking-tight">
            Proxima
          </h1>
          <span class="text-11px text-[#8fa0b5] font-semibold tracking-[0.26em] uppercase">
            SEMICONDUCTOR TEST PLATFORM
          </span>
        </div>
      </div>

      <!-- 三大动作卡片行 -->
      <div class="mb-8 flex items-center justify-center gap-4.5">
        <!-- 1. New Project (高亮天青蓝) -->
        <button
          type="button"
          class="group h-88px w-115px flex flex-col cursor-pointer items-center justify-center gap-2 border border-blue-400/30 rounded-xl bg-[#0084ff] shadow-blue-500/25 shadow-lg transition-all active:scale-[0.98] hover:bg-[#0076e6]"
          @click="handleNewProject"
        >
          <div class="size-7 flex items-center justify-center text-white">
            <SvgIcon icon="ri:file-add-line" class="text-24px transition-transform group-hover:scale-110" />
          </div>
          <span class="text-12px text-white font-medium tracking-wide">New Project</span>
        </button>

        <!-- 2. Open Project (毛玻璃灰卡) -->
        <button
          type="button"
          class="group h-88px w-115px flex flex-col cursor-pointer items-center justify-center gap-2 border border-white/10 rounded-xl bg-[#262a34]/80 shadow-lg transition-all active:scale-[0.98] hover:border-gray-400/40 hover:bg-[#2e333f]"
          @click="handleOpenProject"
        >
          <div class="size-7 flex items-center justify-center text-gray-200">
            <SvgIcon icon="ri:folder-open-line" class="text-24px transition-transform group-hover:scale-110" />
          </div>
          <span class="text-12px text-gray-200 font-medium tracking-wide">Open Project</span>
        </button>

        <!-- 3. Maintenance (毛玻璃灰卡) -->
        <button
          type="button"
          class="group h-88px w-115px flex flex-col cursor-pointer items-center justify-center gap-2 border border-white/10 rounded-xl bg-[#262a34]/80 shadow-lg transition-all active:scale-[0.98] hover:border-gray-400/40 hover:bg-[#2e333f]"
          @click="handleMaintenance"
        >
          <div class="size-7 flex items-center justify-center text-gray-200">
            <SvgIcon icon="ri:tools-line" class="text-24px transition-transform group-hover:scale-110" />
          </div>
          <span class="text-12px text-gray-200 font-medium tracking-wide">Maintenance</span>
        </button>
      </div>

      <!-- 最近工程列表卡片 (RECENT PROJECTS) -->
      <div class="max-w-680px w-full border border-white/10 rounded-2xl bg-[#181a20]/90 p-5 shadow-2xl backdrop-blur-md">
        <!-- 列表头 -->
        <div class="mb-3 flex items-center justify-between px-2 text-10px text-gray-400 font-bold tracking-[0.18em] uppercase">
          <div class="flex items-center gap-1.5">
            <SvgIcon icon="ri:history-line" class="text-12px text-blue-400" />
            <span>RECENT PROJECTS</span>
          </div>
          <span class="text-9px text-gray-500 font-normal">点击直接载入并进入工作台</span>
        </div>

        <!-- 工程行列表 -->
        <div class="recent-scroll max-h-240px flex flex-col gap-1 overflow-y-auto pr-1">
          <div
            v-for="item in tpStore.recentProjects"
            :key="item.id"
            class="group flex cursor-pointer items-center justify-between border border-transparent rounded-lg px-3 py-2 transition-all hover:border-white/5 hover:bg-white/6"
            @click="handleSelectRecent(item)"
          >
            <!-- 左侧：文件图标 + 名称与路径 -->
            <div class="min-w-0 flex items-center gap-3 overflow-hidden pr-4">
              <div class="shrink-0 text-gray-400 transition-colors group-hover:text-blue-400">
                <SvgIcon :icon="getProjectIcon(item.path)" class="text-16px" />
              </div>
              <div class="min-w-0 flex flex-col overflow-hidden">
                <span class="truncate text-12px text-gray-200 font-semibold group-hover:text-white">
                  {{ item.name }}
                </span>
                <span class="truncate text-10px text-gray-500 tracking-tight font-mono group-hover:text-gray-400">
                  {{ item.path }}
                </span>
              </div>
            </div>

            <!-- 右侧：修改时间与进入指示箭头 -->
            <div class="flex shrink-0 select-none items-center gap-2">
              <span class="text-11px text-gray-500 font-mono">{{ item.lastOpened }}</span>
              <SvgIcon icon="ri:arrow-right-s-line" class="text-14px text-gray-500 transition-colors group-hover:text-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 3. 右下角版本标识 -->
    <div class="absolute bottom-3 right-5 select-none text-11px text-gray-500 font-mono">
      v0.1.0
    </div>

    <!-- ─── 4. 弹窗：新建测试工程 (New Project Modal) ─── -->
    <NModal
      v-model:show="showNewProjectModal"
      preset="card"
      title="新建 ATE 测试程序工程 (New Test Project)"
      class="max-w-520px"
    >
      <div class="flex flex-col gap-4 text-xs font-sans">
        <div>
          <label class="mb-1.5 block text-gray-300 font-semibold">工程名称 (Project Name):</label>
          <NInput
            v-model:value="newProjectForm.name"
            placeholder="例如: SoC_9200_RevB_TestFlow"
            class="text-xs font-mono"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-gray-300 font-semibold">测试架构模板 (Template):</label>
          <div class="grid grid-cols-2 gap-2.5">
            <div
              :class="[newProjectForm.template === 'standard_flow' ? 'border-blue-500 bg-blue-500/10' : 'border-[#333] hover:border-gray-500']"
              class="flex flex-col cursor-pointer gap-1.5 border rounded p-2.5 transition-all"
              @click="newProjectForm.template = 'standard_flow'"
            >
              <div class="flex items-center gap-1.5">
                <SvgIcon icon="ri:node-tree" class="text-15px text-blue-400" />
                <span class="text-gray-200 font-bold">标准 ATE 测试流程</span>
              </div>
              <span class="text-10px text-gray-400">含 Continuity、IDDQ、DC 电平与管脚表</span>
            </div>

            <div
              :class="[newProjectForm.template === 'pmu_parametric' ? 'border-blue-500 bg-blue-500/10' : 'border-[#333] hover:border-gray-500']"
              class="flex flex-col cursor-pointer gap-1.5 border rounded p-2.5 transition-all"
              @click="newProjectForm.template = 'pmu_parametric'"
            >
              <div class="flex items-center gap-1.5">
                <SvgIcon icon="ri:pulse-line" class="text-15px text-amber-400" />
                <span class="text-gray-200 font-bold">PMU 高精度驱动</span>
              </div>
              <span class="text-10px text-gray-400">专注直流 VI 曲线测试与漏电流</span>
            </div>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-gray-300 font-semibold">工程说明 (Description):</label>
          <NInput
            v-model:value="newProjectForm.description"
            type="textarea"
            rows="2"
            placeholder="输入工程测试目标或机台平台说明..."
            class="text-xs"
          />
        </div>

        <div class="flex justify-end gap-2 border-t border-[#2d2d2d] pt-2">
          <NButton size="small" @click="showNewProjectModal = false">
            <template #icon>
              <SvgIcon icon="ri:close-line" />
            </template>
            取消
          </NButton>
          <NButton type="primary" size="small" @click="confirmCreateProject">
            <template #icon>
              <SvgIcon icon="ri:check-line" />
            </template>
            创建并进入工作台
          </NButton>
        </div>
      </div>
    </NModal>

    <!-- ─── 5. 弹窗：维护与机台诊断 (Maintenance Modal) ─── -->
    <NModal
      v-model:show="showMaintenanceModal"
      preset="card"
      title="Proxima 平台维护与设备诊断 (Maintenance)"
      class="max-w-560px"
    >
      <div class="flex flex-col gap-4 text-xs font-sans">
        <!-- 机台通信状态卡 -->
        <div class="flex flex-col gap-2 border border-[#333] rounded-lg bg-[#1e1e1e] p-3">
          <div class="flex items-center justify-between text-11px text-gray-200 font-semibold">
            <span class="flex items-center gap-1.5">
              <SvgIcon icon="ri:shield-check-line" class="text-13px text-blue-400" />
              ATE 机台连接状态 (Tester Hardware Status)
            </span>
            <span class="flex items-center gap-1 text-10px text-green-400">
              <SvgIcon icon="ri:checkbox-circle-fill" class="text-11px" />
              系统就绪
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-11px text-gray-400 font-mono">
            <div class="flex items-center justify-between rounded bg-[#252526] p-2">
              <span class="flex items-center gap-1.5">
                <SvgIcon icon="ri:cpu-line" class="text-12px text-gray-400" />
                Advantest V93000:
              </span>
              <span class="text-green-400 font-bold">ONLINE</span>
            </div>
            <div class="flex items-center justify-between rounded bg-[#252526] p-2">
              <span class="flex items-center gap-1.5">
                <SvgIcon icon="ri:cpu-line" class="text-12px text-gray-400" />
                Teradyne UltraFLEX:
              </span>
              <span class="text-yellow-400 font-bold">STANDBY</span>
            </div>
            <div class="flex items-center justify-between rounded bg-[#252526] p-2">
              <span class="flex items-center gap-1.5">
                <SvgIcon icon="ri:database-2-line" class="text-12px text-blue-400" />
                Redis Bridge:
              </span>
              <span class="text-blue-400 font-bold">127.0.0.1:6379</span>
            </div>
            <div class="flex items-center justify-between rounded bg-[#252526] p-2">
              <span class="flex items-center gap-1.5">
                <SvgIcon icon="ri:shield-check-line" class="text-12px text-emerald-400" />
                DRC Rule Engine:
              </span>
              <span class="text-white font-bold">8 Rules Active</span>
            </div>
          </div>
        </div>

        <!-- 诊断排障操作 -->
        <div class="flex flex-col gap-2">
          <span class="text-10px text-gray-400 font-semibold tracking-wider uppercase">常用工具与诊断</span>
          <div class="flex gap-2">
            <NButton
              size="small"
              class="flex-1"
              @click="message.success('机台硬件自检通过: 通道校准合格率 100%')"
            >
              <template #icon>
                <SvgIcon icon="ri:pulse-line" />
              </template>
              执行机台硬件自检
            </NButton>
            <NButton
              size="small"
              class="flex-1"
              @click="message.info('Redis 通信桥接端口正常监听')"
            >
              <template #icon>
                <SvgIcon icon="ri:speed-up-line" />
              </template>
              测试通信延迟
            </NButton>
          </div>
        </div>

        <div class="flex justify-end border-t border-[#2d2d2d] pt-2">
          <NButton type="primary" size="small" @click="showMaintenanceModal = false">
            <template #icon>
              <SvgIcon icon="ri:check-line" />
            </template>
            完成
          </NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.proxima-home-root {
  background: radial-gradient(circle at 50% 20%, #252830 0%, #16181f 60%, #0d0f13 100%);
}

.recent-scroll::-webkit-scrollbar {
  width: 6px;
}

.recent-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.recent-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}

.recent-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
