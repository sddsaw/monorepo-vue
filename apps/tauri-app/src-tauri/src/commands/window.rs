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
        window.set_focus().map_err(|e| AppError::Window(e.to_string()))?;
        return Ok(());
    }

    let webview_url = if url.starts_with("http://") || url.starts_with("https://") {
        tauri::WebviewUrl::External(url.parse().map_err(|e| AppError::Url(format!("{:?}", e)))?)
    } else {
        tauri::WebviewUrl::App(url.into())
    };

    let w = width.unwrap_or(800.0);
    let h = height.unwrap_or(600.0);

    tauri::WebviewWindowBuilder::new(&app, &label, webview_url)
        .title(title)
        .inner_size(w, h)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}
