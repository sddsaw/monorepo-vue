# 工作台 iframe 面板

从顶部第二行工具栏左侧的「Iframe 演示」文字按钮打开本地示例，无需先展开菜单；原有「工具 → Iframe 演示」入口也保留。两个入口打开同一个标签，重复点击会激活已有示例。可与测试项上下、左右分屏，并拖动分隔线调整尺寸。示例的表单输入只保留在网页中，不写入工程。

项目通过 `useTpStore().openIframeTab()` 打开独立网页标签：

```ts
useTpStore().openIframeTab({
  id: 'demo',
  title: 'Iframe 演示',
  src: `${import.meta.env.BASE_URL}iframe-demo/index.html`,
})
```

相同 `id` 会激活已有面板，不重复创建或改变其地址。iframe 标签不参与工程 JSON 的修改标记。

`WorkbenchIframe.vue` 负责 iframe，`DockviewContent.vue` 负责选择网页或业务内容。网页直接填满面板，内部滚动不受业务表单的滚动模式影响。示例在 `public/iframe-demo/index.html`，开发和打包后都可离线加载。

Dockview 1.17.2 不需要单独的 iframe 启用 API。其标签拖动和分隔线拖动已内置 iframe 鼠标事件保护：开始时临时设置 `pointer-events: none`，结束时恢复。工作台把分隔线的鼠标命中范围从 4px 扩为 12px，并通过 Dockview 的 `gap: 12` 在面板之间预留独立拖动区域，避免覆盖内容滚动条。两处尺寸须同步调整；布局坐标和尺寸限制仍由 Dockview 管理。

iframe 默认使用 `sandbox="allow-scripts"`，不开放宿主同源访问、顶层导航或弹窗。当前 Tauri CSP 仅允许同源页面；接入外部站点时需按实际目标配置 `frame-src`，且目标页面本身必须允许被嵌入。不要仅为嵌入网页给 iframe 开放 Tauri 原生权限。

调整分隔线不会重载 iframe；跨组移动涉及 DOM 重新挂载时，浏览器可能重新加载 iframe。需要跨组保留网页状态的业务应由嵌入页面另行持久化。

验证：`tests/workbench-iframe.browser.mjs` 覆盖菜单入口、上方整行/下方左右的嵌套布局、60%–200% 缩放时横纵分隔线命中与尺寸变化，以及 iframe 鼠标保护和输入恢复。运行时需启动 Vite 并提供 Playwright；可通过 `PLAYWRIGHT_MODULE` 指定外部安装路径。
