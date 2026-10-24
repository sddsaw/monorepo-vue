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

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Window(_) => "WINDOW_ERROR",
            Self::Io(_) => "IO_ERROR",
            Self::Url(_) => "URL_ERROR",
            Self::Custom(_) => "CUSTOM_ERROR",
        }
    }
}

#[derive(Serialize)]
struct ErrorPayload<'a> {
    code: &'a str,
    message: String,
}

// 序列化为结构化错误对象 { code, message } 供前端 IPC 按错误类型精准处理
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let payload = ErrorPayload {
            code: self.code(),
            message: self.to_string(),
        };
        payload.serialize(serializer)
    }
}

pub type AppResult<T> = Result<T, AppError>;
