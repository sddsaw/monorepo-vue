use serde::{Deserialize, Serialize};
use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub tauri_version: String,
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("你好，{}！来自 Rust 后端的问候 (Tauri v2 IPC 运行正常)", name)
}

#[tauri::command]
pub async fn get_system_info() -> AppResult<SystemInfo> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        tauri_version: tauri::VERSION.to_string(),
    })
}

#[tauri::command]
pub async fn get_log_dir(app: tauri::AppHandle) -> AppResult<String> {
    use tauri::Manager;
    let path = app.path().app_log_dir().map_err(|e| crate::error::AppError::Custom(e.to_string()))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_log_dir(app: tauri::AppHandle) -> AppResult<()> {
    use tauri::Manager;
    use tauri_plugin_opener::OpenerExt;

    let path = app.path().app_log_dir().map_err(|e| crate::error::AppError::Custom(e.to_string()))?;

    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| crate::error::AppError::Io(e.to_string()))?;
    }

    app.opener()
        .open_path(path.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|e| crate::error::AppError::Io(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub fn restart_app(app: tauri::AppHandle) {
    app.restart();
}
