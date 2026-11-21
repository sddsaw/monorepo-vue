import type { WindowTitleBarMenu } from '../components/basic/WindowTitleBar/types'
import { $t } from '@/locales'
import { useTpStore } from '@/store/modules/tp'
import { useWorkbenchLayoutStore } from '@/store/modules/workbenchLayout'
import { openIframeDemo } from './iframeDemo'

/**
 * 获取窗口标题栏顶部菜单配置（全量使用 $t 国际化驱动）
 */
export function getMenus(): WindowTitleBarMenu[] {
  const tpStore = useTpStore()
  const layoutStore = useWorkbenchLayoutStore()

  return [
    {
      key: 'file',
      label: $t('workbench.menu.file'),
      children: [
        {
          key: 'open',
          label: $t('workbench.menu.openProject'),
          icon: 'ri:folder-open-line',
          shortcut: 'Ctrl+O',
          onSelect: () => tpStore.chooseAndOpenFile(),
        },
        {
          key: 'save',
          label: $t('workbench.menu.saveFile'),
          icon: 'ri:save-line',
          shortcut: 'Ctrl+S',
          onSelect: () => tpStore.saveFile(),
        },
      ],
    },
    {
      key: 'edit',
      label: $t('workbench.menu.edit'),
      children: [
        {
          key: 'undo',
          label: $t('workbench.menu.undo'),
          icon: 'ri:arrow-go-back-line',
          shortcut: 'Ctrl+Z',
        },
        {
          key: 'redo',
          label: $t('workbench.menu.redo'),
          icon: 'ri:arrow-go-forward-line',
          shortcut: 'Ctrl+Y',
        },
      ],
    },
    {
      key: 'view',
      label: $t('workbench.menu.view'),
      children: [
        {
          key: 'toggle-sidebar',
          label: $t('workbench.menu.toggleSidebar'),
          icon: 'ri:layout-left-line',
          shortcut: 'Ctrl+B',
          onSelect: () => layoutStore.toggleSidebar(),
        },
        {
          key: 'toggle-bottom',
          label: $t('workbench.menu.toggleBottomPanel'),
          icon: 'ri:layout-bottom-line',
          shortcut: 'Ctrl+J',
          onSelect: () => layoutStore.toggleBottomPanel(),
        },
        {
          key: 'toggle-secondary',
          label: $t('workbench.menu.toggleSecondarySidebar'),
          icon: 'ri:layout-right-line',
          onSelect: () => layoutStore.toggleSecondarySidebar(),
        },
        {
          key: 'zoom-in',
          label: 'Zoom In',
          divided: true,
          icon: 'ri:zoom-in-line',
          shortcut: 'Ctrl++',
          onSelect: () => layoutStore.zoomIn(),
        },
        {
          key: 'zoom-out',
          label: 'Zoom Out',
          icon: 'ri:zoom-out-line',
          shortcut: 'Ctrl+-',
          onSelect: () => layoutStore.zoomOut(),
        },
        {
          key: 'reset-zoom',
          label: 'Reset Zoom',
          icon: 'ri:refresh-line',
          shortcut: 'Ctrl+0',
          onSelect: () => layoutStore.resetZoom(),
        },
        {
          key: 'fullscreen',
          label: 'Fullscreen',
          divided: true,
          icon: 'ri:fullscreen-line',
          shortcut: 'F11',
          onSelect: () => layoutStore.toggleFullscreen(),
        },
      ],
    },
    {
      key: 'run',
      label: $t('workbench.menu.run'),
      children: [
        {
          key: 'run-test',
          label: $t('workbench.menu.runTestFlow'),
          icon: 'ri:play-circle-line',
          onSelect: () => tpStore.runValidation(),
        },
        {
          key: 'validate',
          label: $t('workbench.menu.runDrc'),
          icon: 'ri:file-settings-line',
          shortcut: 'Ctrl+V',
          onSelect: () => tpStore.runValidation(),
        },
      ],
    },
    {
      key: 'tools',
      label: $t('workbench.menu.tools'),
      children: [
        {
          key: 'iframe-demo',
          label: $t('workbench.menu.iframeDemo'),
          icon: 'ri:window-line',
          onSelect: openIframeDemo,
        },
        {
          key: 'hardware-check',
          label: $t('workbench.menu.hardwareCheck'),
          icon: 'ri:cpu-line',
        },
        {
          key: 'channel-map',
          label: $t('workbench.menu.channelMap'),
          icon: 'ri:node-tree',
        },
      ],
    },
    {
      key: 'settings',
      label: $t('workbench.controls.settings'),
      children: [
        {
          key: 'preferences',
          label: $t('workbench.menu.preferences'),
          icon: 'codicon:settings-gear',
          shortcut: 'Ctrl+,',
        },
      ],
    },
    {
      key: 'help',
      label: $t('workbench.menu.help'),
      children: [
        {
          key: 'shortcuts',
          label: $t('workbench.menu.shortcuts'),
          icon: 'ri:keyboard-line',
        },
        {
          key: 'about',
          label: $t('workbench.menu.about'),
          icon: 'ri:information-line',
        },
      ],
    },
  ]
}
