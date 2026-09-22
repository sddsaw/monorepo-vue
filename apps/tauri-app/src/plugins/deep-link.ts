import type { Router } from 'vue-router'
import { logger } from './logger'
import { isTauri } from './tauri'

/**
 * 设置自定义协议唤起与深层链接 (Deep Link) 监听
 * 协议支持: soybean://...
 * 示例:
 * soybean://sub-window -> 跳转到 /sub-window
 * soybean://navigate?path=/sub-window
 */
export async function setupDeepLink(router: Router): Promise<void> {
  if (!isTauri()) {
    logger.debug('当前为 Web 环境，跳过 Deep Link 监听')
    return
  }

  function handleDeepLinkUrls(urls: string[] | null) {
    if (!urls || urls.length === 0)
      return

    logger.info('处理 Deep Link 自定义协议调用', { urls })

    for (const rawUrl of urls) {
      try {
        const parsed = new URL(rawUrl)
        let targetPath = parsed.pathname || '/'

        if (parsed.searchParams.has('path')) {
          targetPath = parsed.searchParams.get('path') || '/'
        }
        else if (parsed.host && parsed.host !== 'navigate') {
          targetPath = `/${parsed.host}${parsed.pathname}`
        }

        if (targetPath) {
          logger.info(`Deep Link 即将导航到: ${targetPath}`)
          router.push(targetPath)
        }
      }
      catch (err) {
        logger.warn('解析 Deep Link URL 异常', { rawUrl, error: String(err) })
      }
    }
  }

  try {
    const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')

    // 1. 冷启动检查：获取启动当前应用的 URL
    const initialUrls = await getCurrent()
    if (initialUrls && initialUrls.length > 0) {
      handleDeepLinkUrls(initialUrls)
    }

    // 2. 热运行监听：运行期间响应系统协议触发
    await onOpenUrl((urls: string[]) => {
      handleDeepLinkUrls(urls)
    })

    logger.info('Deep Link 协议监听 (soybean://) 已就绪')
  }
  catch (err) {
    logger.warn('Deep Link 初始化失败', { error: String(err) })
  }
}
