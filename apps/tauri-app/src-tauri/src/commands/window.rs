use tauri::Manager;
use crate::error::{AppError, AppResult};

/// 允许在 WebView 中打开的内部窗口标签白名单
const ALLOWED_WEBVIEW_LABELS: &[&str] = &["sub-window"];

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
    let is_external = url.starts_with("http://") || url.starts_with("https://");

    // 外部 URL 直接在系统浏览器中打开，不创建 WebView 窗口
    if is_external {
        use tauri_plugin_opener::OpenerExt;
        app.opener()
            .open_url(&url, None::<&str>)
            .map_err(|e| AppError::Url(format!("无法打开外部链接: {}", e)))?;
        return Ok(());
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
        let _ = window.show();
        let _ = window.unminimize();
        window.set_focus().map_err(|e| AppError::Window(e.to_string()))?;
        return Ok(());
    }

    let clean_path = url.trim_start_matches('/');
    let webview_url = tauri::WebviewUrl::App(clean_path.into());

    let w = width.unwrap_or(800.0);
    let h = height.unwrap_or(600.0);

    let mut builder = tauri::WebviewWindowBuilder::new(&app, &label, webview_url)
        .title(title)
        .inner_size(w, h)
        .resizable(true);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }

    let window = builder.build().map_err(|e| AppError::Window(e.to_string()))?;

    // 1. 显式以逻辑像素 (LogicalSize) 锁定窗口尺寸，避免跨不同 DPI 显示器时出现 2x 缩放尺寸偏差
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: w, height: h }));

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

        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(center_x, center_y)));
    } else {
        let _ = window.center();
    }

    Ok(())
}

