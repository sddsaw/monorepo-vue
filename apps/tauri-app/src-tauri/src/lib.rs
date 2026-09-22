mod commands;
mod error;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 0. 日志系统：滚动文件 + 控制台
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("app".into()),
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .max_file_size(10_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        // 1. 原生持久化存储
        .plugin(tauri_plugin_store::Builder::default().build())
        // 2. 单实例保护：杜绝多开，重复启动时聚焦主窗口
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        // 3. 窗口状态自动持久化记忆（位置、宽高、最大化状态）
        .plugin(tauri_plugin_window_state::Builder::default().build())
        // 4. 官方原生系统插件
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        // 5. 初始化桌面系统托盘
        .setup(|app| {
            #[cfg(desktop)]
            {
                tray::create_tray(app.handle())?;
            }
            Ok(())
        })
        // 6. 拦截主窗口点击红叉事件，实现隐藏至托盘
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        // 7. 注册业务 IPC 命令
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_system_info,
            commands::get_log_dir,
            commands::open_log_dir,
            commands::open_new_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
