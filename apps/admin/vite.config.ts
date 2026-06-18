import { createViteConfig } from '@internal/vite-config'

const routeTitleMap: Record<string, string> = {
  'login': '登录',
  '403': '无权限',
  '404': '页面不存在',
  '500': '服务器错误',
  'iframe-page': '外链页面',
  'home': '首页',
  'demo': '演示页面',
  'demo_from': '表单封装',
  'demo_infinite-scroll': '滚动加载封装',
  'demo_rich-editor': '富文本封装',
}

export default createViteConfig({
  appName: 'admin',
  port: 9527,
  previewPort: 9725,
  scss: {
    additionalData: `@use "@/styles/scss/global.scss" as *;`,
  },
  routerOptions: {
    routePathTransformer(routeName, routePath) {
      if (routeName === 'login') {
        const modules = ['pwd-login', 'code-login', 'register', 'reset-pwd', 'bind-wechat']
        return `/login/:module(${modules.join('|')})?`
      }
      return routePath
    },
    onRouteMetaGen(routeName) {
      const constantRoutes = ['login', '403', '404', '500']
      const meta: Record<string, any> = {
        title: routeTitleMap[routeName] || routeName,
      }
      if (constantRoutes.includes(routeName)) {
        meta.constant = true
      }
      return meta
    },
  },
})
