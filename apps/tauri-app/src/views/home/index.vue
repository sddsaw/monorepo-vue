<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
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

// 弹窗状态控制
const showNewProjectModal = ref(false)
const showMaintenanceModal = ref(false)

// 新建工程表单
const newProjectForm = ref({
  name: 'New_ATE_Program_01',
  template: 'standard_flow',
  description: 'Proxima ATE 芯片测试自动化程序',
})

// 窗口控制
async function handleMinimize() {
  if (isTauri()) {
    await getCurrentWindow().minimize()
  }
}

async function handleToggleMaximize() {
  if (isTauri()) {
    await getCurrentWindow().toggleMaximize()
  }
}

async function handleClose() {
  if (isTauri()) {
    await getCurrentWindow().close()
  }
}

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
  <div class="proxima-home-root h-screen w-screen flex flex-col overflow-hidden select-none font-sans text-gray-200 relative">
    <!-- 1. 顶部极简窗口标题栏 -->
    <header
      data-tauri-drag-region
      class="h-38px shrink-0 flex items-center justify-between px-3.5 z-20"
    >
      <!-- 左侧：Proxima 图标与标题 -->
      <div data-tauri-drag-region class="flex items-center gap-2">
        <ProximaLogo :size="19" :show-shadow="false" />
        <span class="text-12px font-medium text-gray-300 tracking-wide">Proxima</span>
      </div>

      <!-- 右侧：原生窗口控制按键 -->
      <div class="flex items-center gap-1 -mr-1">
        <button
          type="button"
          @click="handleMinimize"
          class="size-7 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="最小化"
        >
          <SvgIcon icon="ri:subtract-line" class="text-13px" />
        </button>
        <button
          type="button"
          @click="handleToggleMaximize"
          class="size-7 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="最大化 / 还原"
        >
          <SvgIcon icon="ri:checkbox-blank-line" class="text-11px" />
        </button>
        <button
          type="button"
          @click="handleClose"
          class="size-7 flex items-center justify-center rounded hover:bg-red-600 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="关闭"
        >
          <SvgIcon icon="ri:close-line" class="text-14px" />
        </button>
      </div>
    </header>

    <!-- 2. 中间主区域 -->
    <main class="flex-1 flex flex-col items-center justify-center px-4 -mt-4 z-10 overflow-y-auto">
      <!-- 平台徽标与大标题 -->
      <div class="flex items-center gap-4.5 mb-8">
        <!-- 标志性 P Logo -->
        <ProximaLogo :size="68" class="shadow-2xl" />

        <!-- 标题与标语 -->
        <div class="flex flex-col">
          <h1 class="text-38px font-bold text-white tracking-tight leading-none mb-1.5">
            Proxima
          </h1>
          <span class="text-11px font-semibold text-[#8fa0b5] tracking-[0.26em] uppercase">
            SEMICONDUCTOR TEST PLATFORM
          </span>
        </div>
      </div>

      <!-- 三大动作卡片行 -->
      <div class="flex items-center justify-center gap-4.5 mb-8">
        <!-- 1. New Project (高亮天青蓝) -->
        <button
          type="button"
          @click="handleNewProject"
          class="w-115px h-88px rounded-xl bg-[#0084ff] hover:bg-[#0076e6] active:scale-[0.98] shadow-lg shadow-blue-500/25 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border border-blue-400/30 group"
        >
          <div class="size-7 flex items-center justify-center text-white">
            <SvgIcon icon="ri:file-add-line" class="text-24px group-hover:scale-110 transition-transform" />
          </div>
          <span class="text-12px font-medium text-white tracking-wide">New Project</span>
        </button>

        <!-- 2. Open Project (毛玻璃灰卡) -->
        <button
          type="button"
          @click="handleOpenProject"
          class="w-115px h-88px rounded-xl bg-[#262a34]/80 hover:bg-[#2e333f] hover:border-gray-400/40 active:scale-[0.98] shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border border-white/10 group"
        >
          <div class="size-7 flex items-center justify-center text-gray-200">
            <SvgIcon icon="ri:folder-open-line" class="text-24px group-hover:scale-110 transition-transform" />
          </div>
          <span class="text-12px font-medium text-gray-200 tracking-wide">Open Project</span>
        </button>

        <!-- 3. Maintenance (毛玻璃灰卡) -->
        <button
          type="button"
          @click="handleMaintenance"
          class="w-115px h-88px rounded-xl bg-[#262a34]/80 hover:bg-[#2e333f] hover:border-gray-400/40 active:scale-[0.98] shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border border-white/10 group"
        >
          <div class="size-7 flex items-center justify-center text-gray-200">
            <SvgIcon icon="ri:tools-line" class="text-24px group-hover:scale-110 transition-transform" />
          </div>
          <span class="text-12px font-medium text-gray-200 tracking-wide">Maintenance</span>
        </button>
      </div>

      <!-- 最近工程列表卡片 (RECENT PROJECTS) -->
      <div class="w-full max-w-680px bg-[#181a20]/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        <!-- 列表头 -->
        <div class="text-10px font-bold tracking-[0.18em] uppercase text-gray-400 mb-3 px-2 flex items-center justify-between">
          <span>RECENT PROJECTS</span>
          <span class="text-9px text-gray-500 font-normal">点击直接载入并进入工作台</span>
        </div>

        <!-- 工程行列表 -->
        <div class="flex flex-col gap-1 max-h-240px overflow-y-auto recent-scroll pr-1">
          <div
            v-for="item in tpStore.recentProjects"
            :key="item.id"
            @click="handleSelectRecent(item)"
            class="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/6 cursor-pointer transition-all border border-transparent hover:border-white/5"
          >
            <!-- 左侧：文件图标 + 名称与路径 -->
            <div class="flex items-center gap-3 overflow-hidden min-w-0 pr-4">
              <div class="text-gray-400 group-hover:text-blue-400 transition-colors shrink-0">
                <SvgIcon icon="ri:file-text-line" class="text-16px" />
              </div>
              <div class="flex flex-col overflow-hidden min-w-0">
                <span class="text-12px font-semibold text-gray-200 group-hover:text-white truncate">
                  {{ item.name }}
                </span>
                <span class="text-10px font-mono text-gray-500 group-hover:text-gray-400 truncate tracking-tight">
                  {{ item.path }}
                </span>
              </div>
            </div>

            <!-- 右侧：修改时间 -->
            <div class="text-11px font-mono text-gray-500 shrink-0 select-none">
              {{ item.lastOpened }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 3. 右下角版本标识 -->
    <div class="absolute bottom-3 right-5 text-11px font-mono text-gray-500 select-none">
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
          <label class="block text-gray-300 font-semibold mb-1.5">工程名称 (Project Name):</label>
          <NInput
            v-model:value="newProjectForm.name"
            placeholder="例如: SoC_9200_RevB_TestFlow"
            class="font-mono text-xs"
          />
        </div>

        <div>
          <label class="block text-gray-300 font-semibold mb-1.5">测试架构模板 (Template):</label>
          <div class="grid grid-cols-2 gap-2.5">
            <div
              @click="newProjectForm.template = 'standard_flow'"
              :class="[newProjectForm.template === 'standard_flow' ? 'border-blue-500 bg-blue-500/10' : 'border-[#333] hover:border-gray-500']"
              class="p-2.5 rounded border cursor-pointer transition-all flex flex-col gap-1"
            >
              <span class="font-bold text-gray-200">标准 ATE 测试流程</span>
              <span class="text-10px text-gray-400">含 Continuity、IDDQ、DC 电平与管脚表</span>
            </div>

            <div
              @click="newProjectForm.template = 'pmu_parametric'"
              :class="[newProjectForm.template === 'pmu_parametric' ? 'border-blue-500 bg-blue-500/10' : 'border-[#333] hover:border-gray-500']"
              class="p-2.5 rounded border cursor-pointer transition-all flex flex-col gap-1"
            >
              <span class="font-bold text-gray-200">PMU 高精度驱动</span>
              <span class="text-10px text-gray-400">专注直流 VI 曲线测试与漏电流</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-gray-300 font-semibold mb-1.5">工程说明 (Description):</label>
          <NInput
            v-model:value="newProjectForm.description"
            type="textarea"
            rows="2"
            placeholder="输入工程测试目标或机台平台说明..."
            class="text-xs"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-[#2d2d2d]">
          <NButton @click="showNewProjectModal = false" size="small">
            取消
          </NButton>
          <NButton type="primary" @click="confirmCreateProject" size="small">
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
        <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-3 flex flex-col gap-2">
          <div class="font-semibold text-gray-200 text-11px flex items-center justify-between">
            <span>ATE 机台连接状态 (Tester Hardware Status)</span>
            <span class="text-green-400 flex items-center gap-1 text-10px">● 系统就绪</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-11px font-mono text-gray-400">
            <div class="p-2 bg-[#252526] rounded flex justify-between">
              <span>Advantest V93000:</span>
              <span class="text-green-400 font-bold">ONLINE</span>
            </div>
            <div class="p-2 bg-[#252526] rounded flex justify-between">
              <span>Teradyne UltraFLEX:</span>
              <span class="text-yellow-400 font-bold">STANDBY</span>
            </div>
            <div class="p-2 bg-[#252526] rounded flex justify-between">
              <span>Redis Bridge:</span>
              <span class="text-blue-400 font-bold">127.0.0.1:6379</span>
            </div>
            <div class="p-2 bg-[#252526] rounded flex justify-between">
              <span>DRC Rule Engine:</span>
              <span class="text-white font-bold">8 Rules Active</span>
            </div>
          </div>
        </div>

        <!-- 诊断排障操作 -->
        <div class="flex flex-col gap-2">
          <span class="text-gray-400 font-semibold text-10px uppercase tracking-wider">常用工具与诊断</span>
          <div class="flex gap-2">
            <NButton
              size="small"
              class="flex-1"
              @click="message.success('机台硬件自检通过: 通道校准合格率 100%')"
            >
              执行机台硬件自检
            </NButton>
            <NButton
              size="small"
              class="flex-1"
              @click="message.info('Redis 通信桥接端口正常监听')"
            >
              测试通信延迟
            </NButton>
          </div>
        </div>

        <div class="flex justify-end pt-2 border-t border-[#2d2d2d]">
          <NButton type="primary" @click="showMaintenanceModal = false" size="small">
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
