# bis
Bazel rules and plugin for developing iOS project on vscode

# Bzlmod
```sh
# MODULE.bazel
bazel_dep(name = "bis", version = "0.2.7", dev_dependency = True)
archive_override(
    module_name = "bis",
    urls = "https://github.com/xinzhengzhang/bis/archive/refs/tags/0.2.7.tar.gz",
    strip_prefix = "bis-0.2.7"
)
```
# Non-bzlmod
```sh
# WORKSPACE
load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')

git_repository(
    name = "bis",
    remote = "git@github.com:xinzhengzhang/bis.git",
    tag = "0.2.7",
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

---
If you insist on independent use, the following are simple ways to use it.
```sh
cd examples
# Extract for single file
bazel run @bis//:setup -- --target //srcs/binary/ios_application:App --compilation_mode dbg --cpu 'ios_x86_64' --file_path srcs/module_a/a.m
# Extract for whole target
bazel run @bis//:setup -- --target //srcs/binary/ios_application:App --compilation_mode dbg --cpu 'ios_x86_64'
# Generate compile_commands.json
bazel run //.bis:refresh_compile_commands --compilation_mode=dbg --cpu=ios_x86_64 --check_visibility=False
# Build sub target
bazel build //srcs/binary/ios_application:App --compilation_mode=dbg --cpu="ios_x86_64" --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis artifacts @@//srcs/module_a:module_a"
# Build app
bazel  build //srcs/binary/ios_application:App --compilation_mode=dbg --cpu="ios_x86_64" --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis artifacts @@//srcs/binary/ios_application:App"

```

# Components
## Targets
### @bis//:setup
---
Create `.bis/BUILD` into WORKSPACE.
This step is done automatically by the plugin


    * Usage
    ```
    bazel run @bis//:setup -- -h

    Arguments:
        -h, --help            show this help message and exit
        --compilation_mode COMPILATION_MODE
                                dbg or opt
        --cpu CPU             ios_arm64
        --target TARGET       target labels
        --file_path FILE_PATH
                                source code path
        --ignore_parsing_targets IGNORE_PARSING_TARGETS
                                skip searching compile targets
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

### refresh_compile_commands_apple_bundle_cfg
---
Exactly like `refresh_compile_commands`, except configured with ios cfg
* minimum_os_version: the same attr with `ios_application`

### refresh_launch_json
---
Create `.vscode/launch.json` for vscode plugins
* target: ios_application

## Thanks to
* [zhao han](https://github.com/BarneyZhaoooo) - For his excellent icon design
