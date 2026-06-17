import type { Editor, FileLoader } from 'ckeditor5'
import { ObjectStorageUploader } from '@sa/utils'

// ==========================================
// 1. 火山引擎 OBS 直传适配器
// ==========================================
class ObsUploadAdapter {
  private loader: FileLoader
  private uploader: ObjectStorageUploader

  constructor(loader: FileLoader, obsConfig?: any) {
    this.loader = loader
    this.uploader = new ObjectStorageUploader(obsConfig || {})
  }

  async upload(): Promise<{ default: string }> {
    const file = await this.loader.file
    if (!file) {
      throw new Error('File not found.')
    }

    try {
      const result = await this.uploader.upload({
        file,
        onProgress: (progress) => {
          // 将上传进度更新同步回 CKEditor 渲染器
          this.loader.uploadTotal = file.size
          this.loader.uploaded = Math.round((progress / 100) * file.size)
        },
      })
      return { default: result.url }
    }
    catch (error) {
      console.error('OBS upload failed:', error)
      throw error
    }
  }

  abort(): void {
    console.warn('Upload aborted.')
  }
}

export function ObsUploadAdapterPlugin(editor: Editor) {
  const obsConfig = editor.config.get('obsConfig')
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: FileLoader) => {
    return new ObsUploadAdapter(loader, obsConfig)
  }
}
