# Unity 客户端界面设计规范与页面编码规则 (Unity Client UI Style Guide)

本规则适用于 SoybeanAdmin 项目中所有页面及组件（`**/*.vue`、样式及 UnoCSS 类）的开发。目标是构建与 **Unity 客户端 / Unity Editor（经典 Pro Dark 工业级引擎界面）** 高度一致的视觉质感与高信息密度交互体验。

---

## 1. 核心设计原则 (Design Principles)

1. **暗色工业工作站风格 (Dark Industrial Workplace)**：
   - 整体色调保持纯正冷中性灰阶梯，严禁纯黑或泛蓝背景。
2. **高信息密度与极致紧凑 (High Density & Compact)**：
   - 摒弃 Web 常见的宽大松散留白，间距以 `4px / 8px / 12px` 为主。
3. **微圆角与纯平无投影 (Sharp Corners & Flat)**：
   - 全局圆角统一为 `2px`（至多 `4px`），**严禁使用任何 `rounded-lg`、`rounded-xl` 或弥散大阴影**。面板间靠 1px 微边框或色差区分层级。
4. **Unity Blue 焦点高亮 (Accent & Focus)**：
   - 默认状态克制低调，仅选定目标、激活 Tab、主操作按钮及聚焦输入框使用 Unity 经典高亮蓝（`#307be1`）。

---

## 2. 色彩与灰度层级规范 (Color Hierarchy)

| 层级名称 | 色值 (HEX / RGB) | UnoCSS 类 / 变量 | 使用场景 |
| :--- | :--- | :--- | :--- |
| **画布/背景 (Canvas Layout)** | `#222222` / `rgb(34, 34, 34)` | `bg-layout` 或 `bg-[#222222]` | 最外层页面背景、未放置面板的空白区 |
| **面板/卡片底色 (Surface/Panel)** | `#383838` / `rgb(56, 56, 56)` | `bg-container` 或 `bg-[#383838]` | `NCard`、Dock 停靠面板、抽屉、Modal 弹窗 |
| **次级/内嵌底色 (Sub-Surface/Inset)**| `#242424` / `rgb(36, 36, 36)` | `bg-[#242424]` | 输入框内底、代码区、属性内嵌表格 |
| **分割线/细边框 (Border Line)** | `#282828` ~ `#303030` | `border-[#2b2b2b]` | 面板边框、表头分割线、工具条下划线 |
| **Unity 主色 (Selection Accent)** | `#307be1` | `primary` 或 `text-[#307be1]` | 选定高亮、激活状态、主操作按钮 |
| **主要文本 (Primary Text)** | `#d2d2d2` / `rgb(215, 215, 215)` | `text-base-text` 或 `text-[#d2d2d2]` | 标题、主要内容文字、高亮字段 |
| **次要文本 (Muted Label)** | `#969696` | `text-[#969696]` | 属性标签（Label）、表头副标题、单位 |
| **控制台/状态色 (Status)** | Error: `#e55454`<br>Warn: `#f0ad4e`<br>Play: `#4caf50` | `error` / `warning` / `success` | Console 日志、状态指示灯、Tag 标签 |

---

## 3. Naive UI 组件书写规则 (Component Rules)

### 3.1 尺寸规则 (Size)
- **强制统一为 `size="small"`**：
  - 所有的 `NButton`、`NInput`、`NSelect`、`NDatePicker`、`NTag`、`NDataTable`、`NCard` 等一律必须显式声明 `size="small"`（或保持 small 规格）。
  - 禁止在常规页面使用 `size="medium"` 或 `size="large"`。

### 3.2 卡片与容器 (NCard & Panels)
- **必须取消大圆角与阴影**：
  - 使用 `class="card-wrapper"`（已配置为 `rd-2px shadow-none border border-[#2b2b2b]`）或直接声明 `:bordered="true"`。
  - `header` 与 `content` 紧凑内边距：使用 `size="small"`，必要时覆写 padding 为 `p-3` 或 `p-2`。
- **标题栏风格 (Inspector Section Header)**：
  - 面板标题应偏小、字体加粗（13px/14px，`font-medium text-[#d2d2d2]`），支持折叠小三角图标。

### 3.3 按钮规范 (NButton)
- **普通工具按钮**：使用默认/灰色背景或 `quaternary`，模拟 Unity 工具栏平铺按钮。
- **主动作**：仅对最重要的行为（保存、应用、发布）使用 `type="primary"`（Unity 蓝）。
- **危险动作**：删除等操作使用 `type="error" ghost size="small"`，二次确认弹窗中再用红色实底。

### 3.4 表格规范 (NDataTable)
- 强制使用 `size="small"`。
- 表头必须为深灰紧凑样式，行高控制在 `32px ~ 36px` 之间，单元格内容单行省略并居中/左对齐。
- 斑马纹/边框：建议开启 `:single-line="false"` 或 `:bordered="true"`，保留桌面软件表格的精细网格感。

### 3.5 表单规范 (NForm - Inspector 风格)
- 模拟 Unity Inspector 属性检查器：
  - 标签居左，紧凑对齐（例如 `label-width="80"` 或 `label-placement="left"`）。
  - 标签字体颜色为次级文本灰（`#969696`），输入框采用紧凑内嵌暗底。
  - 单行高度控制在 `28px` 左右，行间距 `gap-2`。

---

## 4. UnoCSS 类名与布局约定 (Layout & Spacing)

### 4.1 边距与间距 (Spacing)
- **禁止的大边距**：严禁使用 `gap-6`、`gap-8`、`p-6`、`p-8` 等宽大网页边距。
- **推荐紧凑边距**：
  - 页面外层包装：`p-3` (12px) 或 `p-2` (8px)。
  - 组件间距：`gap-2` (8px) 或 `gap-3` (12px)。
  - 表单项垂直间距：`gap-2`。

### 4.2 圆角限制 (Border Radius)
- 全局使用 `rd-2px`（最多 `rd-4px`）。
- **严格禁止**：`rd-8px`、`rd-12px`、`rounded-lg`、`rounded-xl`、`rounded-full`（状态圆点除外）。

### 4.3 阴影限制 (Shadows)
- **严格禁止**：`shadow`、`shadow-md`、`shadow-lg`、`shadow-xl`。
- 统一使用 `shadow-none`，使用 1px 细线 `border border-[#2b2b2b]` 区分边界。

---

## 5. 正确与错误示例对比 (DOs and DON'Ts)

### 5.1 卡片与容器
```vue
<!-- ❌ 错误：Web 常见的大圆角、大阴影、大内边距 -->
<NCard title="用户列表" class="rounded-xl shadow-lg p-6">
  ...
</NCard>

<!-- ✅ 正确：Unity 客户端紧凑、平整微圆角卡片 -->
<NCard
  title="用户列表"
  size="small"
  :bordered="true"
  class="card-wrapper rd-2px shadow-none border border-[#2b2b2b]"
>
  ...
</NCard>
```

### 5.2 操作按钮
```vue
<!-- ❌ 错误：默认尺寸偏大，高饱和度纯圆按钮 -->
<NButton type="primary" size="large" class="rounded-full">新建操作</NButton>

<!-- ✅ 正确：紧凑小型按钮，微圆角 -->
<NButton type="primary" size="small" class="rd-2px">新建操作</NButton>
```

### 5.3 搜索与 Inspector 表单
```vue
<!-- ❌ 错误：宽敞的栅格、大间距 -->
<NForm :model="form" class="gap-6 p-6">
  <NFormItem label="名称"><NInput size="large" /></NFormItem>
</NForm>

<!-- ✅ 正确：紧凑左右排布、高密度属性检查器风格 -->
<NForm :model="form" label-placement="left" label-width="80" class="gap-2">
  <NFormItem label="名称" path="name" class="mb-2">
    <NInput v-model:value="form.name" size="small" class="rd-2px" />
  </NFormItem>
</NForm>
```

