import { request } from '../request'

/**
 * 上传文件（HTTP 通道示例）
 *
 * @param file 文件
 */
export function fetchUploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return request<Api.File.UploadResult>({
    url: '/file/upload',
    method: 'post',
    data: formData,
  })
}
