<script setup lang="ts" generic="T extends string = string">
import { computed } from 'vue'
import SvgIcon from '../../basic/SvgIcon/index.vue'

defineOptions({
  name: 'LangSwitch',
})

const props = withDefaults(defineProps<Props>(), {
  showTooltip: true,
  tooltipText: '切换语言',
})

const emit = defineEmits<Emits>()

interface Props {
  /** Current language */
  lang: T
  /** Language options */
  langOptions: { label: string, key: T, [key: string]: any }[]
  /** Show tooltip */
  showTooltip?: boolean
  /** Tooltip text */
  tooltipText?: string
}

interface Emits {
  (e: 'changeLang', lang: T): void
}

const tooltipContent = computed(() => {
  if (!props.showTooltip)
    return ''

  return props.tooltipText
})

/** Add bottom margin to all options except the last one for proper visual separation */
const dropdownOptions = computed(() => {
  const lastIndex = props.langOptions.length - 1

  return props.langOptions.map((option, index) => ({
    ...option,
    props: {
      class: index < lastIndex ? 'mb-1' : undefined,
    },
  }))
})

function changeLang(lang: T) {
  emit('changeLang', lang)
}
</script>

<template>
  <NDropdown :value="lang" :options="dropdownOptions" trigger="hover" @select="changeLang">
    <div>
      <ButtonIcon :tooltip-content="tooltipContent" tooltip-placement="left">
        <SvgIcon icon="heroicons:language" />
      </ButtonIcon>
    </div>
  </NDropdown>
</template>

<style scoped></style>
