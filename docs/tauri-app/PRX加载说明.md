# PRX 测试程序加载

运行 `pnpm dev:tauri` 后，根路径 `/` 默认跳转到独立的 `/project` 路由（`src/views/project/index.vue`），展示 Proxima 首页。点击第二个 Open Project 入口选择 `.prx` 文件，先检查工程入口、硬件配置、定义及关联文件。只有检查通过才展示模拟 Load 进度，加载成功后跳转到 `/workbench` 工作台路由。

浏览器预览可运行 `pnpm dev:tauri:web`。单文件工程使用 Open Project；包含关联文件的工程使用“选择多文件工程目录”，选择根目录恰好包含一个 `.prx` 的目录。浏览器无法从单个文件自动读取相邻文件，也不能重新读取历史绝对路径；多文件工程需重新选择整个目录。

- 取消选择或取消加载不会进入工作台，也不会替换已打开工程。
- 错误后缀、无效 JSON、空或非对象根节点会显示错误，可以重新选择。
- 当前工程有未保存修改时，替换前会提示确认。
- 未加载工程时直接访问或刷新 `/workbench`，路由守卫会跳回 `/project`，不会挂载空工作台。首页与工作台不再通过 `rawJson` 条件切换，共享的加载弹窗由应用层承载。
- 已加载工程时返回 `/project` 仍展示首页，保留当前工程数据。
- 最近列表只记录加载成功的真实 `.prx` 工程；重启回到首页。
- 当前 Load 是模拟过程，不会向 ATE 机台发送测试命令。

## 多文件工程

`Prox.prx` 中 `configFile` 指向 `SimulatedConfig.json`，`DefFileFolder` 指向 `DefFiles`，路径相对入口文件所在目录。桌面端自动读取；JSON 定义目录支持递归遍历。工程引用不允许绝对路径或 `..` 越界，定义目录内部不支持符号链接。

菜单根分类为 DUT、Tester、Test Conditions、Job。Tester / Instruments / Instrument 下的主槽位、模块来自配置文件 `records` 和 `subslotModules`；未配置子槽位显示 FILLER，MIO16 提供 PPMU 功能入口。硬件父节点既能展开，也能点击查看配置；业务分类只展开。样例的 SITEASSEMBLY(1) 已将 subslots 更正为 6，展示六个模块。

| 定义类型 | 菜单位置 | 数据字段 |
| --- | --- | --- |
| pinmap | DUT / Pin Table | individualPins、pinGroups |
| channelmap | Tester / Channel Map | data |
| flowtable | Test Conditions / Flow | data |
| testinstance | Test Conditions / Test Instances | data |
| pinlevels | Test Conditions / Level and Timing / Levels | data |
| mtstimeset | Test Conditions / Level and Timing / Timing | data |
| pinscrambletable | Test Conditions / Pin Scramble | data |
| patternset | Test Conditions / Patterns / Pattern Sets | data |
| globalspec | Test Conditions / Specs / Global Specs | data |
| joblist | Job / Job Composer | jobs |

定义按 JSON 的 `DefFileType` 分类，叶子名称来自文件名。支持同类型多个文件，显示只读表格、配置及来源路径；未知类型归入 Other Definitions 并提示。DC Specs、AC Specs、Characterization 在未配置时保留空分类。

Patterns 的列表来自 `DefFiles/patternset.json`，样例 `pattern_phase1` 引用 `DefFiles/raw_pattern.pat`。检查同时覆盖 `joblist.json` 的 `testProgramPath` 和非空 Job 定义引用；例如裸名 `pinmap` 对应 `DefFiles/pinmap.json`，空的可选字段忽略。

`apps/tauri-app/.env` 中 `VITE_VALIDATE_PROJECT_REFERENCES=false` 默认跳过 `assertReferencedFiles`，仅设置为字符串 `true` 时开启上述关联文件检查；未配置也视为关闭。修改后重启开发服务，发布版本需重新构建。工程入口、配置与定义 JSON 的读取、格式及结构检查仍会执行。

目前实际样例缺少 `DefFiles/raw_pattern.pat` 和 `TestProgram/TestProgram.csproj`：默认关闭关联检查时可继续 Load；开启后，在“工程文件检查”弹窗列出缺失路径及来源，停止打开，不开始 Load、不显示加载百分比、不进入工作台。已有工程及最近记录保持不变。补齐文件后重新选择工程；测试只在临时副本补齐存在性样本，不改动用户原始工程。文件检查不代表波形或测试程序可执行性验证；尚未实现波形解析或执行，PatternTool (External) 显示禁用。

多文件工程的保存层按来源映射写回脏文件，不会将聚合数据写入 `.prx`。当前新增定义与硬件页面为只读；未修改时保存不写文件。旧的单 JSON 内容 `.prx` 仍兼容原有解析。

验证：

```sh
pnpm --filter @apps/tauri-app typecheck
node --test apps/tauri-app/tests/project-bundle.test.mjs apps/tauri-app/tests/project-load.test.mjs apps/tauri-app/tests/workbench-tabs.test.mjs
# 先启动 Vite；如环境未安装 playwright，设置 PLAYWRIGHT_MODULE 为现有运行时模块路径
node apps/tauri-app/tests/project-load.browser.mjs
PROJECT_FIXTURE=/Users/zhouenbo/Desktop/93k node apps/tauri-app/tests/project-bundle.browser.mjs
# 在 apps/tauri-app/src-tauri 下执行；PRX_FIXTURE 启用实际样例验证
PRX_FIXTURE=/Users/zhouenbo/Desktop/93k/Prox.prx cargo test commands::project::tests --lib
```
