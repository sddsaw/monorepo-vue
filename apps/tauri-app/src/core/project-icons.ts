/** ATE 导航语义映射：分类和定义文件共用业务符号，展开状态由树箭头表达。 */
export const projectGroupIcons: Record<string, string> = {
  'DUT': 'lucide:cpu',
  'Pin Table': 'ate:pin-table',
  'Tester': 'ate:instrument-rack',
  'Channel Map': 'ate:channel-map',
  'Instruments': 'ate:instrument-rack',
  'Test Conditions': 'lucide:sliders-horizontal',
  'Flow': 'lucide:workflow',
  'Test Instances': 'lucide:list-checks',
  'Level and Timing': 'lucide:square-activity',
  'Levels': 'ate:pin-levels',
  'Timing': 'tabler:wave-square',
  'Pin Scramble': 'lucide:shuffle',
  'Patterns': 'ate:digital-pattern',
  'Pattern Sets': 'ate:digital-pattern',
  'Specs': 'lucide:clipboard-list',
  'Global Specs': 'lucide:earth',
  'DC Specs': 'ate:dc-level',
  'AC Specs': 'tabler:wave-sine',
  'Characterization': 'lucide:chart-scatter',
  'Job': 'lucide:clipboard-check',
  'Job Composer': 'lucide:list-ordered',
  'Other Definitions': 'lucide:files',
}

/** 未知型号仍使用板卡符号，不猜测它的电源、模拟或数字测量能力。 */
export function projectHardwareIcon(type: string): string {
  switch (type.toUpperCase()) {
    case 'SITEASSEMBLY': return 'ate:site-assembly'
    case 'FILLER': return 'ate:empty-slot'
    case 'PPMU': return 'ate:ppmu'
    default: return 'lucide:circuit-board'
  }
}
