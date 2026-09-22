use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("窗口错误: {0}")]
    Window(String),

    #[error("IO 错误: {0}")]
    Io(String),

    #[error("网络/URL 错误: {0}")]
    Url(String),

    #[error("系统通用错误: {0}")]
    Custom(String),
}

// 序列化为结构化字符串供前端 IPC 获取
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

pub type AppResult<T> = Result<T, AppError>;
