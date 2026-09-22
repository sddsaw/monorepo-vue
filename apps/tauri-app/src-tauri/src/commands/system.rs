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
pub fn get_system_info() -> AppResult<SystemInfo> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        tauri_version: "2.x".to_string(),
    })
}
