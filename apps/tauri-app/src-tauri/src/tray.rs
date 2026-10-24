use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

/// 聚焦并显示指定窗口（含 unminimize 以兼容 Windows 最小化场景）
fn focus_window<R: Runtime>(window: &tauri::WebviewWindow<R>) {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

/// 创建应用系统托盘图标及右键菜单
pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "隐藏主窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

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
                    let _ = window.hide();
                }
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

