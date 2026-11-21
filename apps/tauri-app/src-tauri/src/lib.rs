mod commands;
mod error;
#[cfg(target_os = "macos")]
mod menu;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        // 0. 日志系统：滚动文件 + 控制台 + Webview
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
                tray::focus_window(&window);
            }
        }))
        // 4. 官方原生系统插件（遵循最小化引入原则）
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        // 5. 初始化跨平台桌面系统菜单、窗口装饰与托盘
        .setup(|app| {
            #[cfg(desktop)]
            {
                // macOS 使用系统级顶部菜单栏 + Overlay 沉浸式红绿灯标题栏
                #[cfg(target_os = "macos")]
                {
                    let app_menu = menu::init_menu(app.handle())?;
                    app.set_menu(app_menu)?;
                }

                // Windows / Linux 关闭原生标题栏装饰，避免与前端 GlobalHeader 自绘窗口控制按钮及菜单栏冲突
                #[cfg(not(target_os = "macos"))]
                if let Some(main_window) = app.get_webview_window("main") {
                    if let Err(e) = main_window.set_decorations(false) {
                        log::warn!("设置主窗口无边框模式失败: {}", e);
                    }
                }

                // 启动时确保主窗口恢复默认尺寸 (1100x750) 并在屏幕上下及左右严格居中
                if let Some(main_window) = app.get_webview_window("main") {
                    let default_size = tauri::Size::Logical(tauri::LogicalSize {
                        width: 1100.0,
                        height: 750.0,
                    });
                    if let Err(e) = main_window.set_size(default_size) {
                        log::warn!("重置主窗口默认尺寸失败: {}", e);
                    }
                    if let Err(e) = main_window.center() {
                        log::warn!("主窗口居中对齐失败: {}", e);
                    }
                }

                tray::create_tray(app.handle())?;
            }
            Ok(())
        })
        // 6. 统一监听菜单事件
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "open_logs" => {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = commands::open_log_dir(handle).await {
                            log::warn!("打开日志目录失败: {}", e);
                        }
                    });
                }
                "preferences" => {
                    use tauri::Emitter;
                    if let Some(window) = app.get_webview_window("main") {
                        tray::focus_window(&window);
                    }
                    if let Err(e) = app.emit("open-settings", ()) {
                        log::warn!("广播 open-settings 事件失败: {}", e);
                    }
                }
                #[cfg(debug_assertions)]
                "redis_devtools" => {
                    use tauri::Emitter;
                    if let Err(e) = app.emit("redis-devtools:open", ()) {
                        log::warn!("广播 redis-devtools:open 事件失败: {}", e);
                    }
                }
                #[cfg(debug_assertions)]
                "devtools" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_devtools_open() {
                            window.close_devtools();
                        } else {
                            window.open_devtools();
                        }
                    }
                }
                _ => {}
            }
        })
        // 7. 拦截主窗口关闭事件，实现隐藏至系统托盘
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    if let Err(e) = window.hide() {
                        log::warn!("隐藏主窗口至托盘失败: {}", e);
                    }
                }
            }
        })
        // 8. 注册业务 IPC 命令
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_system_info,
            commands::get_log_dir,
            commands::open_log_dir,
            commands::restart_app,
            commands::open_new_window,
            commands::read_file_content,
            commands::read_project_bundle,
            commands::save_file_content
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        // macOS 专属：当主窗口隐藏至后台后，用户点击底部 Dock 图标时重新唤醒并聚焦主窗口
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen {
            has_visible_windows,
            ..
        } = event
        {
            if !has_visible_windows {
                if let Some(window) = app_handle.get_webview_window("main") {
                    tray::focus_window(&window);
                }
            }
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (app_handle, event);
    });
}
