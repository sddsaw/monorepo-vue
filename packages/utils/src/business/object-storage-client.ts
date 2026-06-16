/**
 * 火山引擎 TOS 上传工具类
 *
 * 基于 @volcengine/tos-sdk 封装，提供文件上传及 URL 构建能力。
 */
import type { PutObjectInput } from '@volcengine/tos-sdk/dist/methods/object/putObject'
import TOS from '@volcengine/tos-sdk'
import { nanoid } from '../basic/nanoid'

// ==================== 类型定义 ====================

export interface OBSConfig {
  /** 访问密钥 ID */
  accessKeyId?: string
  /** 访问密钥 Secret */
  accessKeySecret?: string
  /** 区域 */
  region?: string
  /** 存储桶名称 */
  bucket: string
}

interface UploadOptions {
  /** 文件对象 */
  file: File
  /** 文件路径（可选，不传则自动生成） */
  key?: string
  /** 上传进度回调 */
  onProgress?: (progress: number) => void
  /** 自定义头部 */
  headers?: Record<string, string>
}

interface UploadResult {
  /** 文件访问 URL */
  url: string
  /** 文件在存储桶中的路径 */
  key: string
}

// ==================== 工具函数 ====================

/** 统一错误包装：确保抛出的始终是 Error 实例 */
function wrapError(message: string, error: unknown): Error {
  console.error(`${message}:`, error)
  return error instanceof Error ? error : new Error(message)
}

// ==================== 核心类 ====================

/**
 * 对象存储上传器
 */
export class ObjectStorageUploader {
  private config: OBSConfig
  private readonly obsClient: TOS

  constructor(
    config: Omit<OBSConfig, 'bucket'> & {
      bucket?: string
    } = {},
  ) {
    this.config = {
      bucket: import.meta.env.VITE_DEFAULT_BUCKET,
      accessKeyId: import.meta.env.VITE_OBS_ACCESS_KEY_ID,
      accessKeySecret: import.meta.env.VITE_OBS_SECRET_ACCESS_KEY,
      region: 'cn-shanghai',
      ...(config ?? {}),
    }

    // 初始化 TOS 客户端
    this.obsClient = new TOS({
      bucket: this.config.bucket,
      accessKeyId: this.config.accessKeyId!,
      accessKeySecret: this.config.accessKeySecret!,
      region: this.config.region!,
      requestTimeout: 0, // 关闭超时
    })
  }

  /**
   * 上传文件到火山引擎 TOS
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    const { file, key, onProgress, headers } = options

    // 生成文件路径
    const fileKey = key || this.generateFileName(file.name)

    try {
      // 准备上传参数
      const uploadParams: PutObjectInput = {
        key: fileKey,
        body: file,
        headers,
        // 进度回调
        progress: onProgress
          ? (percent: number) => {
              const progress = Math.round((percent) * 100)
              onProgress(progress)
            }
          : undefined,
      }

      // 执行上传
      const result = await this.obsClient.putObject(uploadParams)
      if (!this.isStatusSuccess(result?.statusCode)) {
        console.error('TOS 上传错误:', result)
        throw result
      }

      return {
        url: this.buildAccessUrl(fileKey),
        key: fileKey,
      }
    }
    catch (error) {
      throw wrapError('火山引擎 TOS 上传失败', error)
    }
  }

  /**
   * 生成随机文件名
   */
  public generateFileName(originalName: string): string {
    const random = nanoid(10)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `uploads/${dateStr}/${random}-${this.sanitizeString(originalName)}`
  }

  /**
   * 获取访问域名
   * @param bucket 存储桶名称，不传则使用默认桶
   */
  static getEndpoint(bucket?: string): string {
    const targetBucket = bucket || import.meta.env.VITE_DEFAULT_BUCKET
    const endpoint = import.meta.env.VITE_OBS_ENDPOINT
    return endpoint.replace('https://', `https://${targetBucket}.`)
  }

  // ==================== 私有方法 ====================

  private isStatusSuccess(statusCode: number) {
    return [200, 204].includes(statusCode)
  }

  /** 构建访问 URL */
  private buildAccessUrl(key: string): string {
    return `${ObjectStorageUploader.getEndpoint(this.config.bucket)}/${key}`
  }

  /**
   * 严格清洗字符串：只保留 汉字、字母、数字、-、_、.
   * 其他所有字符（包括空格）都会变成 _
   */
  private sanitizeString(str: string): string {
    if (!str)
      return ''

    return str
      .replace(/[^\w\u4E00-\u9FA5\-.]/g, '_')
      .replace(/_{2,}/g, '_')
  }
}
