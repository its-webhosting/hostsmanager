// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[tauri::command]
fn open_hosts() {
    if cfg!(target_os = "macos") {
        let _ = std::process::Command::new("open").arg("/etc/hosts").spawn();
    } else if cfg!(target_os = "linux") {
        let _ = std::process::Command::new("open").arg("/etc/hosts").spawn();
    } else if cfg!(target_os = "windows") {
        let _ = std::process::Command::new("notepad")
            .arg("C:\\Windows\\System32\\drivers\\etc\\hosts")
            .spawn();
    }
}

#[tauri::command]
fn save_hosts(hosts_string: &str) {
    if cfg!(target_os = "macos") {
        std::process::Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "do shell script \"echo '{}' > /etc/hosts\" with administrator privileges",
                hosts_string
            ))
            .spawn()
            .unwrap();
    } else if cfg!(target_os = "linux") {
        std::process::Command::new("pkexec")
            .arg("bash")
            .arg("-c")
            .arg(format!("echo '{}' > /etc/hosts", hosts_string))
            .spawn()
            .unwrap();
    } else if cfg!(target_os = "windows") {
        std::fs::write("C:\\Windows\\System32\\drivers\\etc\\hosts", hosts_string).unwrap();
    }

}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);

            app.emit_all("single-instance", Payload { args: argv, cwd })
                .unwrap();
        }))
        .invoke_handler(tauri::generate_handler![open_hosts, save_hosts])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
