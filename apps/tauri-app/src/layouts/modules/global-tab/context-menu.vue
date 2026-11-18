<script setup lang="ts">
import type { DropdownOption } from 'naive-ui'
import { useSvgIcon } from '@sa/components/hooks/icon'
import { computed } from 'vue'
import { $t } from '@/locales'
import { setupIconifyOffline } from '@/plugins/iconify'
import { useTabStore } from '@/store/modules/tab'

defineOptions({
  name: 'ContextMenu',
})

const props = withDefaults(defineProps<Props>(), {
  custom: false,
  isPinned: false,
  excludeKeys: () => [],
  disabledKeys: () => [],
})

const emit = defineEmits<{
  action: [key: App.Global.DropdownKey]
}>()

interface Props {
  /** ClientX */
  x: number
  /** ClientY */
  y: number
  tabId: string
  /** 是否使用外部受控数据源（如工作台 Dockview 标签栏） */
  custom?: boolean
  /** 受控模式下当前标签是否已固定 */
  isPinned?: boolean
  excludeKeys?: App.Global.DropdownKey[]
  disabledKeys?: App.Global.DropdownKey[]
}

if (props.custom) {
  setupIconifyOffline()
}

const visible = defineModel<boolean>('visible')

const { removeTab, clearTabs, clearLeftTabs, clearRightTabs, fixTab, unfixTab, isTabRetain, homeTab } = useTabStore()
const { SvgIconVNode } = useSvgIcon()

type LocalDropdownOption = DropdownOption & {
  key: App.Global.DropdownKey
}

const options = computed(() => {
  const opts: LocalDropdownOption[] = [
    {
      key: 'closeCurrent',
      label: $t('dropdown.closeCurrent'),
      icon: SvgIconVNode({ icon: 'ant-design:close-outlined', fontSize: 18 }),
    },
    {
      key: 'closeOther',
      label: $t('dropdown.closeOther'),
      icon: SvgIconVNode({ icon: 'ant-design:column-width-outlined', fontSize: 18 }),
    },
    {
      key: 'closeLeft',
      label: $t('dropdown.closeLeft'),
      icon: SvgIconVNode({ icon: 'mdi:format-horizontal-align-left', fontSize: 18 }),
    },
    {
      key: 'closeRight',
      label: $t('dropdown.closeRight'),
      icon: SvgIconVNode({ icon: 'mdi:format-horizontal-align-right', fontSize: 18 }),
    },
    {
      key: 'closeAll',
      label: $t('dropdown.closeAll'),
      icon: SvgIconVNode({ icon: 'ant-design:line-outlined', fontSize: 18 }),
    },
  ]

  if (props.custom) {
    if (props.isPinned) {
      opts.push({
        key: 'unpin',
        label: $t('dropdown.unpin'),
        icon: SvgIconVNode({ icon: 'mdi:pin-off-outline', fontSize: 18 }),
      })
    }
    else {
      opts.push({
        key: 'pin',
        label: $t('dropdown.pin'),
        icon: SvgIconVNode({ icon: 'mdi:pin-outline', fontSize: 18 }),
      })
    }
  }
  else if (props.tabId !== homeTab?.id) {
    if (isTabRetain(props.tabId)) {
      opts.push({
        key: 'unpin',
        label: $t('dropdown.unpin'),
        icon: SvgIconVNode({ icon: 'mdi:pin-off-outline', fontSize: 18 }),
      })
    }
    else {
      opts.push({
        key: 'pin',
        label: $t('dropdown.pin'),
        icon: SvgIconVNode({ icon: 'mdi:pin-outline', fontSize: 18 }),
      })
    }
  }

  const { excludeKeys, disabledKeys } = props

  const result = opts.filter(opt => !excludeKeys.includes(opt.key))

  disabledKeys.forEach((key) => {
    const opt = result.find(item => item.key === key)

    if (opt) {
      opt.disabled = true
    }
  })

  return result
})

function hideDropdown() {
  visible.value = false
}

const dropdownAction: Record<App.Global.DropdownKey, () => void> = {
  closeCurrent() {
    removeTab(props.tabId)
  },
  closeOther() {
    clearTabs([props.tabId])
  },
  closeLeft() {
    clearLeftTabs(props.tabId)
  },
  closeRight() {
    clearRightTabs(props.tabId)
  },
  closeAll() {
    clearTabs()
  },
  pin() {
    fixTab(props.tabId)
  },
  unpin() {
    unfixTab(props.tabId)
  },
}

function handleDropdown(optionKey: App.Global.DropdownKey) {
  if (props.custom) {
    emit('action', optionKey)
  }
  else {
    dropdownAction[optionKey]?.()
  }
  hideDropdown()
}
</script>

<template>
  <NDropdown
    :show="visible"
    placement="bottom-start"
    trigger="manual"
    :x="x"
    :y="y"
    :options="options"
    @clickoutside="hideDropdown"
    @select="handleDropdown"
  />
</template>

<style scoped></style>
