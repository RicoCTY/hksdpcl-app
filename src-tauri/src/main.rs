// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    install_panic_hook();

    if let Err(error) = hksdpcl_studio_lib::run() {
        show_startup_error(&format!("HKSDPCL Studio could not start.\n\n{error}"));
        std::process::exit(1);
    }
}

fn install_panic_hook() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        show_startup_error(&format!("HKSDPCL Studio could not start.\n\n{info}"));
        previous(info);
    }));
}

fn show_startup_error(message: &str) {
    #[cfg(windows)]
    show_windows_error(message);

    #[cfg(target_os = "macos")]
    show_macos_error(message);

    #[cfg(not(any(windows, target_os = "macos")))]
    eprintln!("{message}");
}

#[cfg(windows)]
fn show_windows_error(message: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(
            hwnd: *mut core::ffi::c_void,
            lp_text: *const u16,
            lp_caption: *const u16,
            u_type: u32,
        ) -> i32;
    }

    let text: Vec<u16> = OsStr::new(message)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let caption: Vec<u16> = OsStr::new("HKSDPCL Studio")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        MessageBoxW(std::ptr::null_mut(), text.as_ptr(), caption.as_ptr(), 0x10);
    }
}

#[cfg(target_os = "macos")]
fn show_macos_error(message: &str) {
    let escaped = message
        .replace('\\', "\\\\")
        .replace('"', '\\"')
        .replace('\n', "\" & return & \"");
    let script = format!(
        r#"display dialog "{escaped}" with title "HKSDPCL Studio" buttons {{"OK"}} default button "OK" with icon stop"#
    );
    let _ = std::process::Command::new("osascript")
        .args(["-e", &script])
        .status();
}
