use tauri::Manager;
use crate::error::{AppError, AppResult};

/// 打开或聚焦指定标签的原生窗口
#[tauri::command]
pub async fn open_new_window(
    app: tauri::AppHandle,
    label: String,
    title: String,
    url: String,
    width: Option<f64>,
    height: Option<f64>,
) -> AppResult<()> {
    // 若该窗口已存在，则直接将其激活并聚焦到前台
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.show();
        let _ = window.unminimize();
        window.set_focus().map_err(|e| AppError::Window(e.to_string()))?;
        return Ok(());
    }

    let webview_url = if url.starts_with("http://") || url.starts_with("https://") {
        tauri::WebviewUrl::External(url.parse().map_err(|e| AppError::Url(format!("{:?}", e)))?)
    } else {
        let clean_path = url.trim_start_matches('/');
        tauri::WebviewUrl::App(clean_path.into())
    };

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
