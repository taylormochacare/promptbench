/// Whether macOS "Reduce transparency" is enabled. WebKit has no
/// `prefers-reduced-transparency` media query, so the frontend asks us and
/// stamps `data-reduce-transparency` on <html> (design-direction §1.1).
#[tauri::command]
fn reduce_transparency() -> bool {
    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::NSWorkspace;
        NSWorkspace::sharedWorkspace().accessibilityDisplayShouldReduceTransparency()
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![reduce_transparency])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
