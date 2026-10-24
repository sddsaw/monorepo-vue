use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, Runtime,
};

/// 聚焦并显示指定窗口（含 unminimize 以兼容 Windows 最小化场景与 macOS 隐藏场景）
pub fn focus_window<R: Runtime>(window: &tauri::WebviewWindow<R>) {
    if let Err(e) = window.show() {
        log::warn!("显示窗口 [{}] 失败: {}", window.label(), e);
    }
    if let Err(e) = window.unminimize() {
        log::warn!("还原最小化窗口 [{}] 失败: {}", window.label(), e);
    }
    if let Err(e) = window.set_focus() {
        log::warn!("聚焦窗口 [{}] 失败: {}", window.label(), e);
    }
}

/// 创建应用系统托盘图标及右键菜单（兼容 macOS 顶部状态栏与 Windows 右下角任务栏托盘）
pub fn create_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "隐藏主窗口", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let preferences_item = MenuItem::with_id(app, "preferences", "偏好设置...", true, None::<&str>)?;
    let open_logs_item = MenuItem::with_id(app, "open_logs", "打开运行日志目录", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show_item,
            &hide_item,
            &sep1,
            &preferences_item,
            &open_logs_item,
            &sep2,
            &quit_item,
        ],
    )?;

    // 安全获取窗口图标，避免图标缺失时 panic 导致应用启动崩溃
    let icon = app
        .default_window_icon()
        .ok_or_else(|| tauri::Error::AssetNotFound("default window icon".into()))?
        .clone();

    let _tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("Soybean Desktop")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    focus_window(&window);
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = window.hide() {
                        log::warn!("隐藏主窗口失败: {}", e);
                    }
                }
            }
            "preferences" => {
                if let Some(window) = app.get_webview_window("main") {
                    focus_window(&window);
                }
                if let Err(e) = app.emit("open-settings", ()) {
                    log::warn!("广播 open-settings 事件失败: {}", e);
                }
            }
            "open_logs" => {
                let handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::commands::open_log_dir(handle).await {
                        log::warn!("打开日志目录失败: {}", e);
                    }
                });
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    focus_window(&window);
                }
            }
        })
        .build(app)?;

    Ok(())
}

