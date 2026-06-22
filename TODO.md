# Soybean Admin TODO List

## 🚀 待办与优化事项

- [x] **1. 确认 `auto-components` 安装与配置**
  - [x] 依赖已安装 (`unplugin-vue-components` 已存在于 root 及 `internal/vite-config` 中)
  - [x] 检查 `internal/vite-config` 中是否已正确启用该插件并自动生成相应的 `components.d.ts` 类型声明

- [ ] **2. 解决 Git 推送仓库速度慢的问题**
  - [ ] 配置 Git 全局代理（如：`git config --global http.proxy http://127.0.0.1:xxxx`）
  - [ ] 尝试使用 SSH 密钥替代 HTTPS 协议进行推送
  - [ ] 运行 `git gc --prune=now` 压缩本地仓库历史体积

- [x] **3. 抽离 tsconfig 统一管理**
  - [x] 在 `internal/tsconfig` 中定义一套通用的 base tsconfig 配置，各个 app 和 package 直接通过 `extends` 继承，减少重复代码

- [x] **4. 评估抽离 eslint 的必要性**
  - [x] 评估后已决定抽离，并已将 ESLint 配置成功提取至共享包 `internal/eslint-config`
  - [x] 根目录与子应用（`apps/*`）均已修改为继承该共享包，显著提升了工程化模块度与 IDE 独立解析友好度

- [x] **5. 网络请求库取舍 (alova VS axios)**
  - [x] **决策**：保留 `axios`。经排查，`@sa/axios` 正在被 `apps/*` 广泛使用，而 `@sa/alova` 未被任何地方引用
  - [x] 清理/删除无用的 `packages/alova` 目录以简化代码库

- [x] **6. 彻底去除多语言功能 (i18n)**
  - [x] 全局搜索并替换 `$t('...')` 和 `t('...')` 为硬编码中文
  - [x] 删除 `vue-i18n` 依赖及相关的 `locales` 语言包文件
  - [x] 简化路由 meta 中与多语言相关的配置

- [ ] **7. 定期更新 package 依赖**
  - [x] 根目录已配置 `pnpm update-pkg` (基于 `@sa/scripts` 自带的更新命令)
  - [ ] 可配合使用 `pnpm update -i` (交互式更新) 或配置 `taze` / `npm-check-updates` 工具

---

## 💡 新增推荐补充项

- [x] **8. 统一使用 pnpm catalog 规范依赖版本**
  - [x] 将各子项目中常用的公共依赖（例如 `vue`、`vite`、`typescript` 等）迁移到 [pnpm-workspace.yaml](file:///Users/zhouenbo/soybean-admin/pnpm-workspace.yaml) 的 `catalog` 中管理，确保版本绝对一致

- [x] **9. 清理主应用 package.json 中冗余的 devDependencies**
  - [x] 既然已经将 Vite 配置抽离到了 `internal/vite-config`，各 `apps/*/package.json` 中已无需重复声明那些仅用于构建的 Vite 插件（如 `unplugin-vue-components`、`vite-plugin-progress` 等），保持依赖干净

- [x] **10. 开启构建体积可视化分析 (bundle visualizer)**
  - [x] 在 `internal/vite-config` 中配置 `rollup-plugin-visualizer`，方便排查各个子应用的构建体积瓶颈

- [ ] **11. 开发 i18n 自动化移除脚本**
  - [ ] 编写一个简单的 Node.js 脚本（使用 AST 或正则），读取 `zh-CN.json`，将项目中的 `t('xxx')` 和 `$t('xxx')` 自动替换为对应的中文文本，避免繁琐的人工全局替换

- [x] **12. 优化 Turbo 缓存输入（inputs），缩短类型检查/Lint 时间**
  - [x] 在 [turbo.json](file:///Users/zhouenbo/soybean-admin/turbo.json) 中为 `build`、`typecheck` 和 `lint` 任务细化了 `inputs` 范围（限制为源码及相关配置文件），避免无关文件（如 Markdown、图片等）变动导致缓存失效，成功实现了 56ms~67ms 的 FULL TURBO 极速缓存响应速度

- [x] **13. 移除 pnpm shamefullyHoist 以规范幽灵依赖**
  - [x] 已在 [pnpm-workspace.yaml](file:///Users/zhouenbo/soybean-admin/pnpm-workspace.yaml) 中关闭了 `shamefullyHoist: true` (改为 `false`)
  - [x] 重新安装依赖并完整编译通过，确保了没有隐式使用的幽灵依赖，极大规范了安全和规范性

- [ ] **14. simple-git-hooks 增加 `pre-push` 钩子进行强类型校验**
  - [ ] 在 `package.json` 的 `simple-git-hooks` 中配置 `"pre-push": "pnpm typecheck"`，确保只有在类型检查完全通过的情况下才能推送到远程分支，防止破坏 CI/CD 编译流程

- [ ] **15. 提取并统一管理各应用的 Mock 接口服务网关**
  - [ ] 针对 `apps/*` 下多端重复定义的 `.env.test` 的 Mock 接口地址，将其收拢到 `internal/vite-config` 或者全局集中配置中，方便后续统一切换测试服、Apifox、预发服和生产服接口

- [ ] **16. 在生产环境打包时开启 Gzip/Brotli 静态资源自动压缩**
  - [ ] 在 `internal/vite-config` 中引入并配置 `vite-plugin-compression` 或在 Rollup 中设置压缩策略，在生产环境构建时自动生成 `.gz`/`.br` 静态资源文件，降低 Nginx 在线实时压缩对 CPU 的消耗，进一步提升网站的首屏加载性能

- [ ] **17. 引入 Dependency Cruiser 强制模块架构边界约束**
  - [ ] 在 Monorepo 中配置 [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser) 或 ESLint 规则，禁止低层级包（如 `packages/utils`）反向导入高层级包（如 `packages/components` 或 `apps/*`），防止意外产生循环依赖或架构耦合

- [ ] **18. 静态图片资源无损压缩与 WebP 自动化转换**
  - [ ] 随着开发推进，各应用 `src/assets` 中的图片资源可能增多，建议集成 `vite-plugin-imagemin`（或使用本地 Sharp 脚本），在生产构建时自动对图片进行无损压缩并生成 WebP 格式，减小打包总体积

- [ ] **19. Echarts 图表库按需引入与打包体积深度优化**
  - [ ] 对项目中使用的 Echarts 进行封装，严格采用 **按需引入（Import on Demand）** 模式（仅引入实际用到的 CanvasRenderer、LineChart、GridComponent 等），禁止 `import * as echarts` 全量引入，控制 vendor.js 大小

- [] time文件不对

- [ ] highlight.io 埋点
- [ ] 错误监控 + 性能
    - [ ] Matomo 自托管 → 用户行为 + 自定义埋点，免费
    - [ ] Sentry 自托管 → 错误监控 + 性能，免费 https://github.com/getsentry/sentry-javascript
            pnpm add @sentry/vue
