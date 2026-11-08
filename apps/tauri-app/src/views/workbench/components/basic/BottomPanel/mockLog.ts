/**
 * ATE Studio 仿真模拟日志数据流生成器 (Mock Logs)
 * 模拟从 Redis 高频推送的各种业务报文、测试执行与异常日志
 */

export interface MockLogItem {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS'
  module: string
  message: string
}

/** ANSI 颜色与样式转义符常量 */
const ANSI = {
  reset: '\x1B[0m',
  dim: '\x1B[2m',
  bold: '\x1B[1m',
  // 前景色
  gray: '\x1B[90m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  white: '\x1B[37m',
  // 背景色 (Badge 风格)
  bgGreen: '\x1B[42;97m',
  bgRed: '\x1B[41;97m',
  bgYellow: '\x1B[43;30m',
  bgBlue: '\x1B[44;97m',
}

/** 获取格式化的当前时间戳 (YYYY-MM-DD HH:mm:ss.SSS) */
function getTimestamp(): string {
  const now = new Date()
  const time = now.toTimeString().split(' ')[0]
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${time}.${ms}`
}

/** 预置的典型 ATE 工业自动化测试流水线日志模板 */
const LOG_TEMPLATES: Array<() => string> = [
  // 1. 常规通信与握手
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.blue}[DEBUG]${ANSI.reset} ${ANSI.cyan}[CAN-Bus]${ANSI.reset} 发送控制帧: ID=0x7DF, DLC=8, Data=[02 01 0D 00 00 00 00 00] -> ${ANSI.green}ACK OK${ANSI.reset}`,

  // 2. 仪器仪表控制
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.cyan}[INFO]${ANSI.reset}  ${ANSI.magenta}[PowerSupply]${ANSI.reset} 程控直流稳压电源 CH1 设置: ${ANSI.bold}12.00V${ANSI.reset}, 限流: ${ANSI.bold}2.50A${ANSI.reset} (回读: 12.012V / 0.324A)`,

  // 3. 测试通过项 (带绿色 Badge)
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.bgGreen} PASS ${ANSI.reset} ${ANSI.cyan}[ATE-DRC]${ANSI.reset} 芯片基准稳压源测试: 实测 ${ANSI.green}3.302V${ANSI.reset} (公差 [3.250V, 3.350V])`,

  // 4. Redis 数据缓存交互
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.cyan}[INFO]${ANSI.reset}  ${ANSI.blue}[Redis:Stream]${ANSI.reset} 批量上传高频采样点: 1024 点波形数组, 压缩吞吐耗时 ${ANSI.yellow}1.8ms${ANSI.reset}`,

  // 5. 警告提示 (带黄色 Badge)
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.bgYellow} WARN ${ANSI.reset} ${ANSI.yellow}[Thermal-Sensor] 芯片表面热敏探针温度上升至 76.8°C (逼近上限阈值 80.0°C)${ANSI.reset}`,

  // 6. 逻辑分析仪采样
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.blue}[DEBUG]${ANSI.reset} ${ANSI.cyan}[LogicAnalyzer]${ANSI.reset} 捕获 I2C 通信时序: SCL 频率 400kHz, SDA 响应耗时 120ns, 校验通过`,

  // 7. 测试失败异常项 (带红色 Badge)
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.bgRed} FAIL ${ANSI.reset} ${ANSI.red}[Flash-Verify] 扇区 0x08004000 CRC32 校验失败! 期望 0x9AF0321B, 实际 0x00000000 (通信超时)${ANSI.reset}`,

  // 8. 流程完成
  () =>
    `${ANSI.gray}[${getTimestamp()}]${ANSI.reset} ${ANSI.green}[SUCCESS]${ANSI.reset} ${ANSI.cyan}[FlowEngine]${ANSI.reset} 阶段测试项 #102 执行结束, 总耗时: ${ANSI.bold}42.5ms${ANSI.reset}`,
]

/**
 * 获取一条随机单行 Mock 日志 (带 ANSI 格式化字符)
 */
export function getRandomMockLog(): string {
  const index = Math.floor(Math.random() * LOG_TEMPLATES.length)
  return LOG_TEMPLATES[index]()
}

/**
 * 一次性生成指定条数的日志（用于压力测试与大数据量渲染测试）
 * @param count 模拟生成的总条数，例如 10,000 条
 */
export function generateBulkLogs(count = 5000): string[] {
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(getRandomMockLog())
  }
  return result
}

/**
 * 启动定时模拟推送日志流（模拟来自 Redis 的高频实时推流）
 *
 * @param callback 每次接收到新日志时的回调
 * @param intervalMs 推送间隔时间 (毫秒)，默认 300ms
 * @returns 停止推流的取消函数
 *
 * @example
 * ```ts
 * const stop = startMockLogStream((log) => {
 *   outputTerminalRef.value?.appendLog(log)
 * }, 200)
 *
 * // 组件卸载时调用 stop()
 * ```
 */
export function startMockLogStream(
  callback: (logLine: string) => void,
  intervalMs = 300,
): () => void {
  const timer = setInterval(() => {
    callback(getRandomMockLog())
  }, intervalMs)

  return () => {
    clearInterval(timer)
  }
}
