<script setup lang="ts">
import type { OBSConfig } from '@sa/utils'
import type { UploadCustomRequestOptions, UploadFileInfo, UploadInst, UploadOnRemove } from 'naive-ui'
import type { FormItemInjection } from 'naive-ui/es/_mixins/use-form-item'
import { ObjectStorageUploader } from '@sa/utils'
import { NUpload, NUploadDragger, useMessage } from 'naive-ui'
import { computed, inject, ref, watch } from 'vue'
import SvgIcon from '../../basic/SvgIcon/index.vue'

// 1. 组件选项定义
defineOptions({
  name: 'FileUpload',
})

// 3. Props 和 Emits 定义
const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  max: 5,
  multiple: true,
  accept: 'image/*',
  disabled: false,
  showFileList: true,
  listType: 'image-card',
  isDirectoryDnd: false,
  autoUploadObs: true,
})

const emit = defineEmits<Emits>()

// 2. 类型与接口声明
type FileItem = string | string[]

interface Props {
  /** v-model 绑定的文件列表 */
  modelValue?: FileItem
  /** 最大上传数量 */
  max?: number
  /** 最大文件大小（字节） */
  maxSize?: number
  /** 是否支持多选 */
  multiple?: boolean
  /** 接受的文件类型 */
  accept?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示文件列表 */
  showFileList?: boolean
  /** 列表类型 */
  listType?: 'text' | 'image' | 'image-card'
  /** 是否支持拖拽文件夹 */
  isDirectoryDnd?: boolean
  /** OBS 配置 */
  obsConfig?: OBSConfig
  /** 上传前的钩子 */
  beforeUpload?: (file: File) => boolean | Promise<boolean>
  /** 是否自动上传到 OBS（true=自动上传，false=只选择文件并通过事件传出） */
  autoUploadObs?: boolean
}

interface Emits {
  /** 更新绑定的文件数据源（v-model） */
  (e: 'update:modelValue', value: FileItem): void
  /** 文件数据源变更事件 */
  (e: 'change', fileList: FileItem): void
  /** 上传任务启动事件 */
  (e: 'uploadStart', file: File): void
  /** 上传进度更新事件 */
  (e: 'uploadProgress', file: File, progress: number): void
  /** 上传成功事件，返回上传后的云文件 URL */
  (e: 'uploadSuccess', file: string): void
  /** 上传失败事件 */
  (e: 'uploadError', error: any, file: File): void
  /** 移除文件事件 */
  (e: 'remove', file: FileItem): void
  /** 当 autoUploadObs 为 false 时，选择文件后的回调事件 */
  (e: 'fileSelected', files: File[]): void
}

// 4. 依赖注入
const uploadProvider = inject<{
  fetchConvertMovToMp4?: (formData: FormData) => Promise<{ error?: any, data: Blob }>
}>('uploadProvider', {})

const NFormItem = inject<FormItemInjection | null>('n-form-item', null)

// 5. 组件响应式状态
const message = useMessage()
const uploadRef = ref<UploadInst>()
const internalFileList = ref<UploadFileInfo[]>([])
const emittedFileKeys = new Set<string>() // 用于去重、记录已触发过 fileSelected 的文件 key

// 6. 计算属性
const fileList = computed<string[]>(() => {
  if (!props.modelValue)
    return []
  return Array.isArray(props.modelValue)
    ? props.modelValue.filter(Boolean)
    : [props.modelValue].filter(Boolean)
})

// 检查是否达到最大上传数量（包含正在上传的文件）
const isMaxReached = computed(() => {
  return internalFileList.value.length >= props.max
})

// 检查是否有文件正在上传
const isUploading = computed(() => {
  return internalFileList.value.some(file => file.status === 'uploading')
})

// 创建 ObjectStorageUploader 实例 (支持外部 obsConfig 动态覆盖)
const uploader = computed(() => new ObjectStorageUploader(props.obsConfig || {}))

// 7. 监听器 (Watchers)

// 监听外部 modelValue 变化，同步文件列表状态
watch(
  () => props.modelValue,
  () => {
    const currentUrls = fileList.value

    // 1. 过滤已完成但外部不存在的文件，保留正在上传的项
    internalFileList.value = internalFileList.value.filter(
      item => item.status === 'uploading' || (item.url && currentUrls.includes(item.url)),
    )

    // 2. 将外部新增的 URL 同步追加到文件列表中
    currentUrls.forEach((url) => {
      const exist = internalFileList.value.some(item => item.url === url)
      if (!exist) {
        internalFileList.value.push({
          id: getIdByUrl(url),
          url,
          name: decodeURIComponent(url.split('/').pop() || ''),
          status: 'finished',
        })
      }
    })
  },
  { immediate: true, deep: true },
)

// 当不是 autoUpload 时，选择文件后不上传，而是把文件对象传出给外部
watch(
  () => internalFileList.value.slice(),
  (list) => {
    if (!props.autoUploadObs) {
      const files: File[] = []
      for (const item of list) {
        const f = item.file
        if (f) {
          const key = `${f.name}_${f.size}_${(f as any).lastModified || 0}`
          if (!emittedFileKeys.has(key)) {
            emittedFileKeys.add(key)
            files.push(f)
          }
        }
      }
      if (files.length)
        emit('fileSelected', files)
    }
  },
  { deep: true, immediate: true },
)

// 8. 核心方法与事件处理器

function getIdByUrl(url: string) {
  return url ? encodeURIComponent(url.split('/').pop() || '') : url
}

// 触发表单字段校验
function validateThisField() {
  if (NFormItem) {
    NFormItem.handleContentChange()
  }
}

// 上传前检查
async function handleBeforeUpload(data: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
}) {
  const { file } = data

  // 检查数量限制
  if (isMaxReached.value) {
    message.warning(`最多只能上传 ${props.max} 个文件`)
    return false
  }

  // 检查文件大小限制
  if (props.maxSize && file.file) {
    const maxSizeBytes = props.maxSize
    if (file.file.size > maxSizeBytes) {
      message.warning(`文件大小不能超过 ${props.maxSize / 1024 / 1024}MB`)
      return false
    }
  }

  // 执行自定义的 beforeUpload 钩子
  if (props.beforeUpload && file.file) {
    try {
      return props.beforeUpload(file.file)
    }
    catch (error) {
      console.warn(error)
      message.error('文件验证失败')
      return false
    }
  }

  return true
}

// 火山引擎 TOS 上传函数
async function uploadToOBS(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<{
  url: string
  key: string
}> {
  return uploader.value.upload({
    file,
    onProgress,
  })
}

// 自定义上传处理
async function handleCustomRequest(options: UploadCustomRequestOptions) {
  const { file, onProgress, onFinish, onError } = options
  if (!props.autoUploadObs) {
    onFinish()
    return
  }

  try {
    emit('uploadStart', file.file!)

    const rawFile = file.file!
    // 判断是不是 mov 视频，如果是则先转成 mp4 格式再上传
    if (
      (rawFile.type === 'video/mov' || rawFile.name.toLowerCase().endsWith('.mov'))
      && uploadProvider?.fetchConvertMovToMp4
    ) {
      const formData = new FormData()
      formData.append('file', rawFile)
      const loadingTips = (window.$message || message)?.loading('视频格式转化中，请耐心等待...', { duration: 0 })
      try {
        const { error, data: mp4Blob } = await uploadProvider.fetchConvertMovToMp4(formData)
        if (error) {
          throw error
        }
        const newFileName = rawFile.name.replace(/\.mov$/i, '.mp4')
        file.file = new File([mp4Blob!], newFileName, { type: 'video/mp4' })
      }
      finally {
        loadingTips?.destroy()
      }
    }

    // 执行 OBS 上传，传递进度回调
    const { url } = await uploadToOBS(file.file!, (progress: number) => {
      onProgress({ percent: progress })
      emit('uploadProgress', file.file!, progress)
    })

    const fnd = internalFileList.value.find(v => v.id === file.id)
    if (!fnd) {
      return
    }

    onFinish()
    fnd.url = url

    // 更新模型值
    if (props.multiple) {
      const newValue = [...fileList.value, url]
      emit('update:modelValue', newValue)
      emit('change', newValue)
    }
    else {
      emit('update:modelValue', url)
      emit('change', url)
    }
    emit('uploadSuccess', url)
  }
  catch (error) {
    onError()
    if (file.id) {
      internalFileList.value = internalFileList.value.filter(v => v.id !== file.id)
    }
    emit('uploadError', error, file.file!)
  }
  finally {
    validateThisField()
  }
}

// 移除文件事件处理
function handleRemove(data: Parameters<UploadOnRemove>[0]) {
  const { file } = data
  const fileItem: FileItem = file.url || (file.file ? file.file.name : '')

  if (file.status === 'finished' && file.url) {
    const newList = fileList.value.filter(v => v !== file.url)
    if (props.multiple) {
      emit('update:modelValue', newList)
      emit('change', newList)
    }
    else {
      emit('update:modelValue', '')
      emit('change', '')
    }
  }

  emit('remove', fileItem)
  validateThisField()
  return true
}

// 9. 暴露方法和状态给父组件
defineExpose({
  uploadRef,
  isUploading,
})
</script>

<template>
  <div>
    <NUpload
      ref="uploadRef"
      v-model:file-list="internalFileList"
      :multiple="multiple"
      :accept="accept"
      :disabled="disabled"
      :show-file-list="showFileList"
      :list-type="listType"
      :max="max"
      :custom-request="handleCustomRequest"
      :on-before-upload="handleBeforeUpload"
      :on-remove="handleRemove"
      v-bind="$attrs"
    >
      <NUploadDragger v-if="isDirectoryDnd">
        <slot>
          <div class="flex flex-col items-center justify-center py-24px">
            <div class="mb-12px text-40px text-primary">
              <SvgIcon icon="mdi:cloud-upload" />
            </div>
            <p class="mb-4px text-16px text-gray-600 font-semibold">
              点击或将文件拖拽到这里上传
            </p>
            <p class="text-12px text-gray-400">
              支持单个或批量文件上传
            </p>
          </div>
        </slot>
      </NUploadDragger>
    </NUpload>
  </div>
</template>

<style scoped></style>
