# bis
Bazel rule for developing iOS project on vscode

# Import
```WORKSPACE
load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')

git_repository(
    name = "bis",
    remote = "git@github.com:xinzhengzhang/bis.git",
    branch = "main",
)

load("@bis//:repositories.bzl", "bis_rules_dependencies")

bis_rules_dependencies()

```

# Setup

## Install bis plugin
```
cd plugin/zxz-moe-bis/
vsce package
```

# How to use

see [README](plugin/zxz-moe-bis/README.md) of plugin 

# Components
## Targets
### @bis//:setup
---
Create `.bis/BUILD` into WORKSPACE.
This step is done automatically by the plugin


    * Usage
    ```
    bazel run @bis//:setup -- -h

    optional arguments:
    -h, --help            show this help message and exit
    --compilation_mode COMPILATION_MODE
                            dbg or opt
    --cpu CPU             ios_arm64
    --target TARGET       target labels
    --file_path FILE_PATH
                            source code path
    --pre_compile_swift_module PRE_COMPILE_SWIFT_MODULE
                            pre compile swift module
    ``` 

## Rules

### refresh_compile_commands
---
Create `compile_commands.json` into WORKSAPCE

* file_path: source code path you want to extract
    * this strings was passed to `inputs` in [bazel aquery](https://bazel.build/query/aquery)
    * `.*` means extract all path in targets
* targets: build targets which you want to extract
* optionals: to hedron_compile_commands
* pre_compile_swift_module: should pre build swift module when refreshing `compile_commands.json`

### refresh_launch_json
---
Create `.vscode/launch.json` for vscode plugins
* target: ios_application
