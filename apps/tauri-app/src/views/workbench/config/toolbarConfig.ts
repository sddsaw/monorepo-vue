import type { ToolbarGroup } from '../components/basic/WindowTitleBar/types'
import { $t } from '@/locales'
import { useTpStore } from '@/store/modules/tp'

/**
 * 获取顶部第二行快捷工具栏配置（全量使用 $t 国际化驱动）
 */
export function getToolbarGroups(): ToolbarGroup[] {
  const tpStore = useTpStore()

  return [
    // 1. 工程文件组
    {
      key: 'project',
      items: [
        {
          key: 'import',
          icon: 'ri:download-line',
          tooltip: $t('workbench.toolbar.importTp'),
        },
        {
          key: 'open',
          icon: 'ri:folder-open-line',
          tooltip: $t('workbench.toolbar.openProject'),
          onClick: () => tpStore.chooseAndOpenFile(),
        },
        {
          key: 'save',
          icon: 'ri:save-line',
          tooltip: tpStore.isDirty
            ? $t('workbench.toolbar.saveProjectDirty')
            : $t('workbench.toolbar.saveProject'),
          class: tpStore.isDirty ? 'text-amber-400 hover:text-amber-300 hover:!bg-amber-500/15' : undefined,
          onClick: () => tpStore.saveFile(),
        },
      ],
    },
    // 2. 硬件与规格配置组
    {
      key: 'config',
      items: [
        {
          key: 'chip',
          icon: 'ri:cpu-line',
          tooltip: $t('workbench.toolbar.chipSpec'),
        },
      ],
    },
    // 3. 执行与调试控制核心组 (以微卡片胶囊包裹高亮)
    {
      key: 'execution',
      isCluster: true,
      items: [
        {
          key: 'run',
          icon: 'ri:play-circle-line',
          tooltip: $t('workbench.toolbar.run'),
          class: 'text-emerald-400 hover:text-emerald-300 hover:!bg-emerald-500/20 active:!bg-emerald-500/30',
          onClick: () => tpStore.runValidation(),
        },
        {
          key: 'step',
          icon: 'ri:eject-line',
          tooltip: $t('workbench.toolbar.step'),
          class: 'text-sky-400 hover:text-sky-300 hover:!bg-sky-500/20 active:!bg-sky-500/30',
        },
        {
          key: 'debug',
          icon: 'ri:bug-line',
          tooltip: $t('workbench.toolbar.debug'),
          class: 'text-amber-400 hover:text-amber-300 hover:!bg-amber-500/20 active:!bg-amber-500/30',
        },
        {
          key: 'stop',
          icon: 'ri:stop-circle-line',
          tooltip: $t('workbench.toolbar.stop'),
          class: 'text-rose-400 hover:text-rose-300 hover:!bg-rose-500/20 active:!bg-rose-500/30',
        },
      ],
    },
    // 4. 分析与 DRC 规则校验组
    {
      key: 'analysis',
      items: [
        {
          key: 'topology',
          icon: 'ri:node-tree',
          tooltip: $t('workbench.toolbar.topology'),
        },
        {
          key: 'validate',
          icon: 'ri:file-settings-line',
          tooltip: $t('workbench.toolbar.drc'),
          onClick: () => tpStore.runValidation(),
        },
      ],
    },
  ]
}
