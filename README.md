# bis
Bazel rules and plugin for developing iOS project on vscode

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
code --install-extension zxz-moe.zxz-moe-bis
```

# How to use

These independent rules are too complicated, it is recommended to use them in combination with plugin.

See [README](plugin/zxz-moe-bis/README.md) of plugin 


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
    --pre_launch_task_name PRE_LAUNCH_TASK_NAME
                            custom pre launch task
    --ignore_parsing_targets IGNORE_PARSING_TARGETS
                            Ignore parsing the closest target which contains the file_path
    ``` 

## Rules

### refresh_compile_commands
---
Create `compile_commands.json` into WORKSAPCE

* file_path: source code path you want to extract
    * this strings was passed to `inputs` in [bazel aquery](https://bazel.build/query/aquery)
    * `.*` means extract all path in targets
* targets: build targets which you want to extract
* pre_compile_targets: targets which you want to pre compile
* optionals: to hedron_compile_commands
* pre_compile_swift_module: should pre build swift module when refreshing `compile_commands.json`

### refresh_compile_commands_ios_cfg
---
Exactly like `refresh_compile_commands`, except configured with ios cfg
* minimum_os_version: the same attr with `ios_application`

### refresh_launch_json
---
Create `.vscode/launch.json` for vscode plugins
* target: ios_application

## extract_target_info
---
Print output json of target attributes
* target: ios_application

## Thanks to
* [zhao han](https://github.com/BarneyZhaoooo) - For his excellent icon design
