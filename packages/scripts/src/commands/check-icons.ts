import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import consola from 'consola'

const localRequire = createRequire(import.meta.url)

// 正则匹配时需要忽略的常见误报前缀
const IGNORED_PREFIXES = new Set(['http', 'https', 'v-slot', 'slot'])

interface IconOccurrence {
  iconId: string
  file: string
  line: number
}

/**
 * 解析 node_modules 中 `@iconify/json` 数据集目录的路径
 */
function getIconifyJsonDir(): string {
  try {
    const packageJsonPath = localRequire.resolve('@iconify/json/package.json')
    return path.join(path.dirname(packageJsonPath), 'json')
  }
  catch {
    return path.resolve(process.cwd(), 'node_modules/@iconify/json/json')
  }
}

const iconifyJsonDir = getIconifyJsonDir()

/**
 * 检查图标前缀是否为有效的 Iconify 集合
 */
function isValidCollection(prefix: string): boolean {
  return fs.existsSync(path.join(iconifyJsonDir, `${prefix}.json`))
}

/**
 * 递归查找目录下所有匹配目标扩展名的文件
 */
function scanDirectory(dir: string, extensions: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir))
    return results

  // 使用 withFileTypes 性能更好，因为可以避免调用 fs.statSync
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of list) {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...scanDirectory(filePath, extensions))
    }
    else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      results.push(filePath)
    }
  }
  return results
}

/**
 * 扫描文件并提取所有匹配的图标使用记录
 * @param filePath 文件的绝对路径
 * @param relativeBaseDir 用于计算报告中相对路径的基础目录
 */
function extractIconsFromFile(filePath: string, relativeBaseDir: string): IconOccurrence[] {
  const occurrences: IconOccurrence[] = []
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const iconRegex = /['" ]([a-z0-9-]+):([a-z0-9-]+)['" ]/g

  lines.forEach((line, index) => {
    const matches = line.matchAll(iconRegex)
    for (const match of matches) {
      const [_, prefix, name] = match
      if (IGNORED_PREFIXES.has(prefix))
        continue

      if (isValidCollection(prefix)) {
        occurrences.push({
          iconId: `${prefix}:${name}`,
          file: path.relative(relativeBaseDir, filePath),
          line: index + 1,
        })
      }
    }
  })

  return occurrences
}

/**
 * 扫描 `packages/` 目录下的共享工作区包，查找图标使用记录
 */
function scanSharedPackagesIcons(rootDir: string): IconOccurrence[] {
  const packagesDir = path.resolve(rootDir, 'packages')
  if (!fs.existsSync(packagesDir))
    return []

  const subdirs = fs.readdirSync(packagesDir).filter((dir) => {
    return fs.statSync(path.join(packagesDir, dir)).isDirectory() && dir !== 'node_modules'
  })

  const extensions = ['.vue', '.ts', '.tsx', '.js', '.jsx']
  return subdirs.flatMap((subdir) => {
    const srcDir = path.join(packagesDir, subdir, 'src')
    const files = scanDirectory(srcDir, extensions)
    return files.flatMap(file => extractIconsFromFile(file, rootDir))
  })
}

/**
 * 审计单个子项目应用，检查是否存在未打包的远程图标
 */
function checkAppIcons(appPath: string, appName: string, sharedOccurrences: IconOccurrence[]) {
  const iconsJsonPath = path.join(appPath, 'icons.json')
  if (!fs.existsSync(iconsJsonPath)) {
    consola.warn(`[${appName}] No icons.json found at: ${iconsJsonPath}`)
    return
  }

  // 1. 解析配置的本地图标列表
  let localIconsConfig: Record<string, string[]> = {}
  try {
    localIconsConfig = JSON.parse(fs.readFileSync(iconsJsonPath, 'utf8'))
  }
  catch (err) {
    consola.error(`[${appName}] Failed to parse icons.json:`, err)
    return
  }

  // 展平为 'prefix:name' 格式的 Set 集合，以便进行 O(1) 复杂度的快速查找
  const localIconsSet = new Set<string>()
  for (const [prefix, names] of Object.entries(localIconsConfig)) {
    if (Array.isArray(names)) {
      names.forEach(name => localIconsSet.add(`${prefix}:${name}`))
    }
  }

  // 2. 扫描应用本地的 src 文件
  const srcDir = path.join(appPath, 'src')
  const files = scanDirectory(srcDir, ['.vue', '.ts', '.tsx', '.js', '.jsx'])
  const localOccurrences = files.flatMap(file => extractIconsFromFile(file, appPath))

  // 3. 整理并比对本地及共享包中的图标记录，看其是否已在配置的离线图标集中声明
  const remoteIconsMap = new Map<string, { file: string, line: number }[]>()
  const allOccurrences = [...localOccurrences, ...sharedOccurrences]

  for (const occ of allOccurrences) {
    if (!localIconsSet.has(occ.iconId)) {
      if (!remoteIconsMap.has(occ.iconId)) {
        remoteIconsMap.set(occ.iconId, [])
      }
      remoteIconsMap.get(occ.iconId)!.push({
        file: occ.file,
        line: occ.line,
      })
    }
  }

  consola.info(`\n========================================`)
  consola.info(`App: ${appName}`)
  consola.info(`========================================`)

  if (remoteIconsMap.size === 0) {
    consola.success(`No remote icons found! All icons used in code and packages are declared in icons.json.`)
  }
  else {
    consola.warn(`Found ${remoteIconsMap.size} remote (unbundled) icons used in code or packages:`)
    for (const [iconId, occurrences] of remoteIconsMap.entries()) {
      consola.log(`\n- Icon: \x1B[33m${iconId}\x1B[0m`)
      occurrences.forEach((occ) => {
        consola.log(`  └─ ${occ.file}:${occ.line}`)
      })
    }
  }
}

/**
 * 主检查命令的执行函数
 */
export async function checkIcons() {
  const rootDir = process.cwd()
  const appsDir = path.resolve(rootDir, 'apps')
  if (!fs.existsSync(appsDir)) {
    consola.error('Cannot find apps directory at:', appsDir)
    return
  }

  consola.info('Scanning shared packages under packages/ directory...')
  const sharedOccurrences = scanSharedPackagesIcons(rootDir)
  consola.info(`Found ${sharedOccurrences.length} icon occurrences in shared packages.`)

  const apps = fs.readdirSync(appsDir).filter((file) => {
    return fs.statSync(path.join(appsDir, file)).isDirectory()
  })

  apps.forEach((app) => {
    checkAppIcons(path.join(appsDir, app), app, sharedOccurrences)
  })
}
