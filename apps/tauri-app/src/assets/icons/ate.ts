/** 自绘 ATE 语义图标。24px 画布、2px 线条，与 Lucide 线性图标保持一致。 */
function outline(body: string) {
  return {
    body: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>`,
  }
}

export const ateIcons = {
  prefix: 'ate',
  width: 24,
  height: 24,
  icons: {
    // 管脚端点与表格行对应。
    'pin-table': outline('<path d="M3 6h5M3 12h5M3 18h5"/><rect x="8" y="3" width="13" height="18" rx="2"/><path d="M8 9h13M8 15h13M14 3v18"/>'),
    // 两侧端点之间的一一通道连接。
    'channel-map': outline('<path d="M6 5h3l6 14h3M6 12h12M6 19h3l6-14h3"/><path d="M2 3h4v4H2zM2 10h4v4H2zM2 17h4v4H2zM18 3h4v4h-4zM18 10h4v4h-4zM18 17h4v4h-4z"/>'),
    // 测试仪器机架，区别于待测芯片。
    'instrument-rack': outline('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 9h16M4 16h16M8 6h.01M8 13h.01M8 19h.01M12 6h4M12 13h4M12 19h4"/>'),
    // 装有插卡的槽位组件，不以 CPU 表示整个硬件总成。
    'site-assembly': outline('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M15 4v16M5 8v5M11 8v5M18 8v5M5 17h.01M11 17h.01M18 17h.01"/>'),
    // 空槽位/填充面板，不表示活动测量板卡。
    'empty-slot': outline('<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M12 5h.01M12 19h.01M9 12h6"/>'),
    // 参数测量：表头、指针、正负测量端子。
    'ppmu': outline('<path d="M4 15a8 8 0 0 1 16 0"/><path d="m12 15 4-5M4 15v3h16v-3M7 21v-3M17 21v-3M5 8h4M7 6v4M16 8h3"/>'),
    // 上下电平阈值和位于阈值间的信号。
    'pin-levels': outline('<path d="M3 4h18M3 20h18M3 15h5V9h8v6h5"/><path d="m3 7 2-3 2 3m10 10 2 3 2-3"/>'),
    // 两条数字向量，强调 Pattern 与单纯时钟/模拟波形的区别。
    'digital-pattern': outline('<path d="M2 9h4V3h5v6h5V3h6M2 21h9v-6h5v6h6"/>'),
    // 直流符号：实线与断线。
    'dc-level': outline('<path d="M3 9h18M3 15h4m3 0h4m3 0h4"/>'),
  },
}
