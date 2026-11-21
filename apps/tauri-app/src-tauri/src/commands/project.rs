use crate::error::{AppError, AppResult};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Serialize)]
pub struct ProjectTextFile {
    path: String,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBundle {
    project_path: String,
    manifest: String,
    configuration: ProjectTextFile,
    definitions: Vec<ProjectTextFile>,
    available_files: Vec<String>,
}

fn read_text(path: &Path) -> AppResult<String> {
    fs::read_to_string(path)
        .map_err(|e| AppError::Io(format!("无法读取 {}：{}", path.display(), e)))
}

fn parse_json(content: &str, name: &str) -> AppResult<Value> {
    serde_json::from_str(content.trim_start_matches('\u{feff}'))
        .map_err(|e| AppError::Custom(format!("{} 不是有效的 JSON：{}", name, e)))
}

fn relative_path(value: &str) -> AppResult<PathBuf> {
    let normalized = value.replace('\\', "/");
    let path = PathBuf::from(&normalized);
    if normalized.is_empty()
        || normalized.contains(':')
        || path.is_absolute()
        || path
            .components()
            .any(|p| !matches!(p, Component::Normal(_) | Component::CurDir))
    {
        return Err(AppError::Custom(format!(
            "工程引用必须是内部相对路径：{}",
            value
        )));
    }
    Ok(path)
}

fn resolve_inside(root: &Path, value: &str) -> AppResult<PathBuf> {
    let path = root
        .join(relative_path(value)?)
        .canonicalize()
        .map_err(|e| AppError::Io(format!("工程引用不存在 {}：{}", value, e)))?;
    if !path.starts_with(root) {
        return Err(AppError::Custom(format!("工程引用越过根目录：{}", value)));
    }
    Ok(path)
}

fn collect_files(root: &Path, directory: &Path, output: &mut Vec<PathBuf>) -> AppResult<()> {
    for entry in fs::read_dir(directory).map_err(|e| AppError::Io(e.to_string()))? {
        let entry = entry.map_err(|e| AppError::Io(e.to_string()))?;
        let kind = entry.file_type().map_err(|e| AppError::Io(e.to_string()))?;
        // 不跟随目录链接，避免越界或递归环。
        if kind.is_symlink() {
            return Err(AppError::Custom(format!(
                "定义目录中不支持符号链接：{}",
                entry.path().display()
            )));
        }
        if kind.is_dir() {
            collect_files(root, &entry.path(), output)?;
        } else if kind.is_file() && entry.path().starts_with(root) {
            output.push(entry.path());
        }
    }
    Ok(())
}

// 与前端的文件检查保持一致；只收集显式路径，Job 中的定义名由已读取的定义文件匹配。
fn referenced_paths(value: &Value) -> Vec<&str> {
    let mut references = Vec::new();
    let kind = value["DefFileType"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_lowercase();
    if kind == "patternset" {
        if let Some(rows) = value["data"].as_array() {
            references.extend(rows.iter().filter_map(|row| row["filePath"].as_str()));
        }
    } else if kind == "joblist" {
        if let Some(path) = value["testProgramPath"].as_str() {
            references.push(path);
        }
        if let Some(rows) = value["jobs"].as_array() {
            for row in rows {
                for key in [
                    "pinMap",
                    "chanMap",
                    "testInstances",
                    "flowTable",
                    "acSpecs",
                    "dcSpecs",
                    "patternSets",
                    "patternGroups",
                    "binTable",
                    "characterization",
                    "testProcedures",
                ] {
                    if let Some(path) = row[key]
                        .as_str()
                        .filter(|path| path.contains(['/', '\\', '.']))
                    {
                        references.push(path);
                    }
                }
            }
        }
    }
    references
        .into_iter()
        .map(str::trim)
        .filter(|path| !path.is_empty())
        .collect()
}

fn load_bundle(path: &Path) -> AppResult<ProjectBundle> {
    if !path
        .extension()
        .is_some_and(|s| s.eq_ignore_ascii_case("prx"))
    {
        return Err(AppError::Custom("请选择 .prx 测试程序".into()));
    }
    let path = path
        .canonicalize()
        .map_err(|e| AppError::Io(e.to_string()))?;
    let root = path
        .parent()
        .ok_or_else(|| AppError::Custom("无法定位工程目录".into()))?;
    let manifest = read_text(&path)?;
    let json = parse_json(&manifest, "工程入口")?;
    let field = |key: &str| -> AppResult<&str> {
        json[key]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or_else(|| AppError::Custom(format!("工程入口缺少 {}", key)))
    };
    let config_path = resolve_inside(root, field("configFile")?)?;
    let definition_dir = resolve_inside(root, field("DefFileFolder")?)?;
    let relative = |p: &Path| {
        p.strip_prefix(root)
            .unwrap()
            .to_string_lossy()
            .replace('\\', "/")
    };
    let configuration = ProjectTextFile {
        path: relative(&config_path),
        content: read_text(&config_path)?,
    };
    let mut paths = Vec::new();
    collect_files(root, &definition_dir, &mut paths)?;
    paths.sort();
    let mut available_files: Vec<String> = paths.iter().map(|p| relative(p)).collect();
    let mut definitions = Vec::new();
    for file in paths.iter().filter(|p| {
        p.extension()
            .is_some_and(|e| e.eq_ignore_ascii_case("json"))
    }) {
        let content = read_text(file)?;
        let value = parse_json(&content, &relative(file))?;
        for reference in referenced_paths(&value) {
            // 只检查关联文件存在性，不读取或执行波形、测试程序。
            relative_path(reference)?;
            if let Ok(resolved) = resolve_inside(root, reference) {
                if resolved.is_file() {
                    available_files.push(reference.replace('\\', "/"));
                }
            }
        }
        definitions.push(ProjectTextFile {
            path: relative(file),
            content,
        });
    }
    Ok(ProjectBundle {
        project_path: path.to_string_lossy().to_string(),
        manifest,
        configuration,
        definitions,
        available_files,
    })
}

#[tauri::command]
pub async fn read_project_bundle(path: String) -> AppResult<ProjectBundle> {
    tauri::async_runtime::spawn_blocking(move || load_bundle(Path::new(&path)))
        .await
        .map_err(|e| AppError::Custom(e.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_missing_references_and_canonical_project_path() {
        let temp = std::env::temp_dir().join(format!(
            "prx-native-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(temp.join("project/DefFiles")).unwrap();
        let project = temp.join("project/Prox.prx");
        fs::write(
            &project,
            r#"{"configFile":"SimulatedConfig.json","DefFileFolder":"DefFiles"}"#,
        )
        .unwrap();
        assert!(load_bundle(&project).is_err());
        fs::write(temp.join("project/SimulatedConfig.json"), "{}").unwrap();
        fs::write(temp.join("project/DefFiles/pinmap.json"), "{}").unwrap();
        let bundle = load_bundle(&project).unwrap();
        assert_eq!(
            bundle.project_path,
            project.canonicalize().unwrap().to_string_lossy()
        );
        assert_eq!(bundle.definitions.len(), 1);
        fs::create_dir_all(temp.join("project/TestProgram")).unwrap();
        fs::write(temp.join("project/TestProgram/Test.csproj"), "<Project />").unwrap();
        fs::write(temp.join("project/DefFiles/joblist.json"), r#"{"DefFileType":" JOBLIST ","testProgramPath":"TestProgram/Test.csproj","jobs":[{"pinMap":"pinmap","flowTable":"DefFiles/missing.json","acSpecs":""}]}"#).unwrap();
        let with_job = load_bundle(&project).unwrap();
        assert!(with_job
            .available_files
            .contains(&"TestProgram/Test.csproj".into()));
        assert!(!with_job
            .available_files
            .contains(&"DefFiles/missing.json".into()));
        fs::remove_file(temp.join("project/TestProgram/Test.csproj")).unwrap();
        let missing_program = load_bundle(&project).unwrap();
        assert!(!missing_program
            .available_files
            .contains(&"TestProgram/Test.csproj".into()));
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&project, temp.join("linked.prx")).unwrap();
            let linked = load_bundle(&temp.join("linked.prx")).unwrap();
            assert_eq!(linked.project_path, bundle.project_path);
            fs::write(temp.join("outside.json"), "{}").unwrap();
            std::os::unix::fs::symlink(
                temp.join("outside.json"),
                temp.join("project/DefFiles/outside.json"),
            )
            .unwrap();
            assert!(load_bundle(&project).is_err());
        }
        fs::remove_dir_all(temp).unwrap();
    }

    #[test]
    fn rejects_escaping_or_absolute_references() {
        for value in [
            "../outside.json",
            "/tmp/outside",
            "C:\\outside",
            "DefFiles/../../outside",
            "",
        ] {
            assert!(relative_path(value).is_err(), "{}", value);
        }
        assert!(relative_path("DefFiles\\pinmap.json").is_ok());
    }

    #[test]
    fn reads_fixture_when_provided() {
        if let Ok(path) = std::env::var("PRX_FIXTURE") {
            let bundle = load_bundle(Path::new(&path)).unwrap();
            assert_eq!(bundle.definitions.len(), 10);
            assert_eq!(bundle.configuration.path, "SimulatedConfig.json");
            assert!(!bundle
                .available_files
                .contains(&"DefFiles/raw_pattern.pat".into()));
        }
    }
}
