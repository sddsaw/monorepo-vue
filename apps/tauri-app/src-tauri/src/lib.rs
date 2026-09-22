mod commands;
mod error;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 1. 单实例保护：杜绝多开，重复启动时聚焦主窗口
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        // 2. 窗口状态自动持久化记忆（位置、宽高、最大化状态）
        .plugin(tauri_plugin_window_state::Builder::default().build())
        // 3. 官方原生系统插件
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        // 4. 初始化桌面系统托盘
        .setup(|app| {
            #[cfg(desktop)]
            {
                tray::create_tray(app.handle())?;
            }
            Ok(())
        })
        // 5. 拦截主窗口点击红叉事件，实现隐藏至托盘
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        // 6. 注册业务 IPC 命令
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_system_info,
            commands::open_new_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
