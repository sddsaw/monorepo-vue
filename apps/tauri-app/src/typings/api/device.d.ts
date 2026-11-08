declare namespace Api {
  /**
   * namespace Device
   *
   * backend api module: "device"（Redis 通道示例，按实际协议替换）
   */
  namespace Device {
    interface ControlParams {
      deviceId: string
      action: string
      payload?: Record<string, unknown>
    }

    interface ControlResult {
      success: boolean
    }

    interface DeviceStatus {
      deviceId: string
      online: boolean
      updatedAt: number
    }
  }

  /**
   * namespace File
   *
   * backend api module: "file"（HTTP 通道示例）
   */
  namespace File {
    interface UploadResult {
      url: string
      fileName: string
    }
  }
}
