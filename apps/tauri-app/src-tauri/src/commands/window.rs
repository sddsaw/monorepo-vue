use tauri::Manager;
use crate::error::{AppError, AppResult};

/// 允许在 WebView 中打开的内部窗口标签白名单
const ALLOWED_WEBVIEW_LABELS: &[&str] = &["sub-window"];

/// 窗口尺寸安全边界（逻辑像素）
const MIN_WINDOW_WIDTH: f64 = 360.0;
const MAX_WINDOW_WIDTH: f64 = 3840.0;
const MIN_WINDOW_HEIGHT: f64 = 280.0;
const MAX_WINDOW_HEIGHT: f64 = 2160.0;

fn clamp_dimension(value: Option<f64>, default: f64, min: f64, max: f64) -> f64 {
    match value {
        Some(v) if v.is_finite() => v.clamp(min, max),
        _ => default,
    }
}

/// 打开或聚焦指定标签的原生窗口
///
/// - 内部路由（非 http(s)://）：在新 WebView 窗口中加载
/// - 外部 URL（http(s)://）：通过系统默认浏览器打开，不在 WebView 中加载（安全考量）
#[tauri::command]
pub async fn open_new_window(
    app: tauri::AppHandle,
    label: String,
    title: String,
    url: String,
    width: Option<f64>,
    height: Option<f64>,
) -> AppResult<()> {
    let trimmed_url = url.trim();
    if trimmed_url.is_empty() {
        return Err(AppError::Url("窗口目标 URL 不能为空".into()));
    }

    let is_external = trimmed_url.starts_with("http://") || trimmed_url.starts_with("https://");

    // 外部 URL 直接在系统浏览器中打开，不创建 WebView 窗口
    if is_external {
        use tauri_plugin_opener::OpenerExt;
        app.opener()
            .open_url(trimmed_url, None::<&str>)
            .map_err(|e| AppError::Url(format!("无法打开外部链接: {}", e)))?;
        return Ok(());
    }

    // 拦截非法的伪协议或路径穿越
    if trimmed_url.contains("://")
        || trimmed_url.starts_with("javascript:")
        || trimmed_url.starts_with("data:")
        || trimmed_url.contains("..")
    {
        log::warn!("拒绝不安全的内部窗口路径: url={}", trimmed_url);
        return Err(AppError::Url(format!("非法的内部路由路径: {}", trimmed_url)));
    }

    // 内部窗口标签校验：仅允许白名单内的标签
    if !ALLOWED_WEBVIEW_LABELS.contains(&label.as_str()) {
        log::warn!("拒绝创建非白名单窗口: label={}", label);
        return Err(AppError::Window(format!(
            "窗口标签 \"{}\" 不在允许列表中",
            label
        )));
    }

    // 若该窗口已存在，则直接将其激活并聚焦到前台
    if let Some(window) = app.get_webview_window(&label) {
        crate::tray::focus_window(&window);
        return Ok(());
    }

    let clean_path = trimmed_url.trim_start_matches('/');
    let webview_url = tauri::WebviewUrl::App(clean_path.into());

    let w = clamp_dimension(width, 800.0, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH);
    let h = clamp_dimension(height, 600.0, MIN_WINDOW_HEIGHT, MAX_WINDOW_HEIGHT);

    let mut builder = tauri::WebviewWindowBuilder::new(&app, &label, webview_url)
        .title(title)
        .inner_size(w, h)
        .min_inner_size(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT)
        .resizable(true);

    // 跨平台标题栏适配：
    // - macOS 采用 Overlay 沉浸式原生红绿灯标题栏
    // - Windows / Linux 采用无边框 (decorations: false) 配合前端自绘标题栏控件
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    #[cfg(not(target_os = "macos"))]
    {
        builder = builder.decorations(false);
    }

    let window = builder.build().map_err(|e| AppError::Window(e.to_string()))?;

    // 1. 显式以逻辑像素 (LogicalSize) 锁定窗口尺寸，避免跨不同 DPI 显示器时出现 2x 缩放尺寸偏差
    if let Err(e) = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: w, height: h })) {
        log::warn!("设置子窗口逻辑尺寸失败: {}", e);
    }

    // 2. 检测当前主窗口所在的显示器，并在当前操作屏幕上精确定位居中
    let target_monitor = app.get_webview_window("main")
        .and_then(|win| win.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());

    if let Some(monitor) = target_monitor {
        let scale = monitor.scale_factor();
        let mon_pos = monitor.position();
        let mon_size = monitor.size();

        let win_phys_w = (w * scale) as i32;
        let win_phys_h = (h * scale) as i32;

        let center_x = mon_pos.x + (mon_size.width as i32 - win_phys_w) / 2;
        let center_y = mon_pos.y + (mon_size.height as i32 - win_phys_h) / 2;

        if let Err(e) = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(center_x, center_y))) {
            log::warn!("设置子窗口居中位置失败: {}", e);
        }
    } else if let Err(e) = window.center() {
        log::warn!("子窗口默认居中失败: {}", e);
    }

    Ok(())
}

