import { versionBump } from 'bumpp'

export async function release(execute = 'changelogen --output', push = true) {
  await versionBump({
    files: [
      '**/package.json',
      '!**/node_modules',
      'apps/tauri-app/src-tauri/tauri.conf.json',
      'apps/tauri-app/src-tauri/Cargo.toml',
      'apps/tauri-app/src-tauri/Cargo.lock',
    ],
    execute,
    all: true,
    tag: true,
    commit: 'chore(projects): release v%s',
    push,
  })
}
