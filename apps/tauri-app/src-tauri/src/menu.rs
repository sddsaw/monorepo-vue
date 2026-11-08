use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Runtime,
};

/// 初始化桌面端全局原生应用菜单
pub fn init_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    let pkg_info = app.package_info();
    let app_name = &pkg_info.name;

    let about_text = format!("关于 {}", app_name);
    #[cfg(target_os = "macos")]
    let hide_text = format!("隐藏 {}", app_name);
    let quit_text = format!("退出 {}", app_name);

    // 1. 应用主菜单 (App Menu，按平台条件编译 macOS 专属项)
    let about_item = PredefinedMenuItem::about(app, Some(&about_text), None)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let preferences_item = MenuItem::with_id(app, "preferences", "偏好设置...", true, Some("CmdOrCtrl+,"))?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    #[cfg(target_os = "macos")]
    let services_item = PredefinedMenuItem::services(app, Some("服务"))?;
    #[cfg(target_os = "macos")]
    let sep3 = PredefinedMenuItem::separator(app)?;
    #[cfg(target_os = "macos")]
    let hide_item = PredefinedMenuItem::hide(app, Some(&hide_text))?;
    #[cfg(target_os = "macos")]
    let hide_others_item = PredefinedMenuItem::hide_others(app, Some("隐藏其他"))?;
    #[cfg(target_os = "macos")]
    let show_all_item = PredefinedMenuItem::show_all(app, Some("全部显示"))?;
    #[cfg(target_os = "macos")]
    let sep4 = PredefinedMenuItem::separator(app)?;
    let quit_item = PredefinedMenuItem::quit(app, Some(&quit_text))?;

    let mut app_menu_items: Vec<&dyn tauri::menu::IsMenuItem<R>> = vec![
        &about_item,
        &sep1,
        &preferences_item,
        &sep2,
    ];
    #[cfg(target_os = "macos")]
    {
        app_menu_items.push(&services_item);
        app_menu_items.push(&sep3);
        app_menu_items.push(&hide_item);
        app_menu_items.push(&hide_others_item);
        app_menu_items.push(&show_all_item);
        app_menu_items.push(&sep4);
    }
    app_menu_items.push(&quit_item);

    let app_menu = Submenu::with_items(app, app_name, true, &app_menu_items)?;

    // 2. 编辑菜单 (Edit - 必须保留以保证复制/粘贴/剪切等原生快捷键)
    let edit_menu = Submenu::with_items(
        app,
        "编辑",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("撤销"))?,
            &PredefinedMenuItem::redo(app, Some("重做"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("剪切"))?,
            &PredefinedMenuItem::copy(app, Some("复制"))?,
            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
            &PredefinedMenuItem::select_all(app, Some("全选"))?,
        ],
    )?;

    // 3. 视图菜单 (View - 缩放、全屏与调试工具)
    let fullscreen_item = PredefinedMenuItem::fullscreen(app, Some("切换全屏"))?;
    #[cfg(debug_assertions)]
    let devtools_item = MenuItem::with_id(app, "devtools", "切换开发者工具", true, Some("Alt+CmdOrCtrl+I"))?;
    #[cfg(debug_assertions)]
    let redis_devtools_item = MenuItem::with_id(app, "redis_devtools", "Redis 调试面板", true, Some("Alt+CmdOrCtrl+R"))?;

    let mut view_items: Vec<&dyn tauri::menu::IsMenuItem<R>> = vec![&fullscreen_item];
    #[cfg(debug_assertions)]
    view_items.push(&devtools_item);
    #[cfg(debug_assertions)]
    view_items.push(&redis_devtools_item);

    let view_menu = Submenu::with_items(app, "视图", true, &view_items)?;

    // 4. 窗口菜单 (Window - 最小化、缩放)
    let window_menu = Submenu::with_items(
        app,
        "窗口",
        true,
        &[
            &PredefinedMenuItem::minimize(app, Some("最小化"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, Some("关闭窗口"))?,
        ],
    )?;

    // 5. 帮助菜单 (Help - 打开日志等支持)
    let help_menu = Submenu::with_items(
        app,
        "帮助",
        true,
        &[
            &MenuItem::with_id(app, "open_logs", "打开运行日志目录", true, None::<&str>)?,
        ],
    )?;

    // 组合成顶层菜单栏
    let menu = Menu::with_items(
        app,
        &[&app_menu, &edit_menu, &view_menu, &window_menu, &help_menu],
    )?;

    Ok(menu)
}
