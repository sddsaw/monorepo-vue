import { redisClient } from '../redis'

/**
 * 设备控制（Redis 通道示例）
 *
 * @param params 控制参数
 */
export function fetchDeviceControl(params: Api.Device.ControlParams) {
  return redisClient.request<Api.Device.ControlResult>('device:control', params)
}
