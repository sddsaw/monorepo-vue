use crate::error::{AppError, AppResult};
use std::fs;
use std::path::Path;

/// 读取指定绝对路径的本地文本文件内容
#[tauri::command]
pub async fn read_file_content(path: String) -> AppResult<String> {
    fs::read_to_string(&path)
        .map_err(|e| AppError::Io(format!("读取文件失败 ({}): {}", path, e)))
}

/// 将文本内容安全写回指定绝对路径的本地物理文件
#[tauri::command]
pub async fn save_file_content(path: String, content: String) -> AppResult<()> {
    // 自动创建不存在的父级目录
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| AppError::Io(format!("创建目录失败 ({}): {}", parent.display(), e)))?;
        }
    }

    fs::write(&path, content)
        .map_err(|e| AppError::Io(format!("写入文件失败 ({}): {}", path, e)))
}
