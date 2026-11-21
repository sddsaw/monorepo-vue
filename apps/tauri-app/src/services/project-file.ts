import type { ProjectBundle } from '@/core/project-bundle'
import { open } from '@tauri-apps/plugin-dialog'
import { normalizeProjectPath, parseObject } from '@/core/project-bundle'
import { isTauri } from '@/plugins/tauri'

export interface SelectedProjectFile {
  path: string
  read?: () => Promise<string>
  readBundle?: () => Promise<ProjectBundle>
}

export function assertPrxFile(path: string) {
  if (!/\.prx$/i.test(path))
    throw new Error('请选择 .prx 格式的测试程序文件')
}

/** 桌面使用系统对话框；浏览器预览使用相同后缀限制的文件输入。 */
export async function selectProjectFile(): Promise<SelectedProjectFile | null> {
  if (isTauri()) {
    const path = await open({
      title: '打开 Proxima 测试程序',
      multiple: false,
      directory: false,
      filters: [{ name: 'Proxima 测试程序 (.prx)', extensions: ['prx'] }],
    })
    return typeof path === 'string' ? { path } : null
  }

  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.prx'
    input.hidden = true
    const finish = (file: File | null) => {
      input.remove()
      resolve(file ? { path: file.name, read: () => file.text() } : null)
    }
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => finish(null), { once: true })
    document.body.append(input)
    input.click()
  })
}

/** 浏览器不能从单个 File 访问相邻文件；由用户明确选择工程目录授权读取。 */
export function selectProjectDirectory(): Promise<SelectedProjectFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.multiple = true
    input.hidden = true
    input.addEventListener('cancel', () => {
      input.remove()
      resolve(null)
    }, { once: true })
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? [])
      input.remove()
      if (!files.length) {
        resolve(null)
        return
      }
      const entries = new Map(files.map(file => [file.webkitRelativePath.split('/').slice(1).join('/'), file]))
      const projects = [...entries.keys()].filter(path => !path.includes('/') && /\.prx$/i.test(path))
      if (projects.length !== 1) {
        reject(new Error('请选择根目录恰好包含一个 .prx 文件的工程目录'))
        return
      }
      const path = projects[0]
      const read = async (name: string) => {
        const file = entries.get(normalizeProjectPath(name))
        if (!file)
          throw new Error(`工程文件不存在：${name}`)
        return file.text()
      }
      resolve({
        path,
        read: () => read(path),
        readBundle: async () => {
          const manifest = await read(path)
          const data = parseObject(manifest, path)
          if (typeof data.configFile !== 'string' || typeof data.DefFileFolder !== 'string')
            throw new Error('工程入口缺少 configFile 或 DefFileFolder')
          const configPath = normalizeProjectPath(data.configFile)
          const folder = normalizeProjectPath(data.DefFileFolder)
          if (![...entries.keys()].some(name => name.startsWith(`${folder}/`)))
            throw new Error(`定义目录不存在或为空：${folder}`)
          const definitions = await Promise.all([...entries.keys()].sort()
            .filter(name => name.startsWith(`${folder}/`) && /\.json$/i.test(name))
            .map(async name => ({ path: name, content: await read(name) })))
          return { manifest, configuration: { path: configPath, content: await read(configPath) }, definitions, availableFiles: [...entries.keys()] }
        },
      })
    }, { once: true })
    document.body.append(input)
    input.click()
  })
}
