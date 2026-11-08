// @unocss-include
import { getColorPalette, getRgb } from '@sa/color'
import { toggleHtmlClass } from '@sa/utils'
import { DARK_CLASS } from '@/constants/app'
import { localStg } from '@/utils/storage'

export function setupLoading() {
  const themeColor = localStg.get('themeColor') || '#007acc'
  const darkMode = localStg.get('darkMode') || false
  const palette = getColorPalette(themeColor)

  const { r, g, b } = getRgb(themeColor)

  const primaryColor = `--primary-color: ${r} ${g} ${b}`

  const svgCssVars = Array.from(palette.entries())
    .map(([key, value]) => `--logo-color-${key}: ${value}`)
    .join(';')

  const cssVars = `${primaryColor}; ${svgCssVars}`

  if (darkMode) {
    toggleHtmlClass(DARK_CLASS).add()
  }

  const loading = `
<div class="proxima-loading-container" style="${cssVars}">
  <style>
    .proxima-loading-container {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #f8fafc;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      z-index: 9999;
    }
    .dark .proxima-loading-container,
    html.dark .proxima-loading-container {
      background-color: #121214;
      color: #f1f5f9;
    }
    .proxima-logo-box {
      position: relative;
      width: 76px;
      height: 76px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: proxima-pulse 2.6s ease-in-out infinite;
    }
    .proxima-logo-glow {
      position: absolute;
      inset: -6px;
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(0, 210, 255, 0.45), rgba(255, 23, 116, 0.45));
      filter: blur(14px);
      opacity: 0.6;
      animation: proxima-glow 2.6s ease-in-out infinite;
    }
    .proxima-logo-svg {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 22px;
      box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -4px rgba(0, 0, 0, 0.08);
    }
    .dark .proxima-logo-svg,
    html.dark .proxima-logo-svg {
      box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 0 18px rgba(0, 210, 255, 0.2);
    }
    .proxima-brand-title {
      margin-top: 24px;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.08em;
      background: linear-gradient(135deg, #00d2ff 0%, #00e676 50%, #ff1774 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .proxima-progress-bar-wrap {
      margin-top: 20px;
      width: 140px;
      height: 3px;
      border-radius: 9999px;
      background-color: rgba(148, 163, 184, 0.25);
      overflow: hidden;
      position: relative;
    }
    .dark .proxima-progress-bar-wrap,
    html.dark .proxima-progress-bar-wrap {
      background-color: rgba(255, 255, 255, 0.12);
    }
    .proxima-progress-beam {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 45%;
      border-radius: 9999px;
      background: linear-gradient(90deg, #00d2ff, #00e676, #ff1774);
      animation: proxima-beam 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    @keyframes proxima-pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.035);
      }
    }
    @keyframes proxima-glow {
      0%, 100% {
        opacity: 0.45;
        transform: scale(0.96);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }
    @keyframes proxima-beam {
      0% {
        left: -45%;
      }
      100% {
        left: 100%;
      }
    }
  </style>
  <div class="proxima-logo-box">
    <div class="proxima-logo-glow"></div>
    ${getLogoSvg()}
  </div>
  <h2 class="proxima-brand-title">Proxima</h2>
  <div class="proxima-progress-bar-wrap">
    <div class="proxima-progress-beam"></div>
  </div>
</div>`

  const app = document.getElementById('app')

  if (app) {
    app.innerHTML = loading
  }
}

function getLogoSvg() {
  return `<svg
    viewBox="0 0 100 100"
    class="proxima-logo-svg"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <!-- 左侧纵柱渐变 (Cyan -> Emerald Green) -->
      <linearGradient id="loading-proxima-cyan-green" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#00D2FF" />
        <stop offset="60%" stop-color="#00E5FF" />
        <stop offset="100%" stop-color="#00E676" />
      </linearGradient>

      <!-- 右侧回环渐变 (Vibrant Magenta -> Purple Pink) -->
      <linearGradient id="loading-proxima-magenta-purple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF1774" />
        <stop offset="50%" stop-color="#FF007F" />
        <stop offset="100%" stop-color="#B000FF" />
      </linearGradient>

      <!-- 白色底板高光微渐变 -->
      <linearGradient id="loading-proxima-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#F0F4F8" />
      </linearGradient>
    </defs>

    <!-- 优雅圆角白底基座 -->
    <rect
      width="100"
      height="100"
      rx="22"
      fill="url(#loading-proxima-bg-grad)"
    />

    <!-- P 左侧竖立条 (Cyan-Green) -->
    <rect
      x="24"
      y="22"
      width="14"
      height="56"
      rx="7"
      fill="url(#loading-proxima-cyan-green)"
    />

    <!-- P 右侧环形结构 (Magenta-Purple) -->
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M36 22H53C65.15 22 75 30.06 75 40C75 49.94 65.15 58 53 58H36V45H52C56.97 45 61 42.76 61 40C61 37.24 56.97 35 52 35H36V22Z"
      fill="url(#loading-proxima-magenta-purple)"
    />
  </svg>`
}
