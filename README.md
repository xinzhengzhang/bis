# bis
Bazel rules and plugin for developing iOS project on vscode

# Bzlmod
```sh
# MODULE.bazel
bazel_dep(name = "bis", version = "0.3.0", dev_dependency = True)
archive_override(
    module_name = "bis",
    urls = "https://github.com/xinzhengzhang/bis/archive/refs/tags/0.3.0.tar.gz",
    strip_prefix = "bis-0.3.0"
)
```
# Non-bzlmod
```sh
# WORKSPACE
load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')

git_repository(
    name = "bis",
    remote = "git@github.com:xinzhengzhang/bis.git",
    tag = "0.3.0",
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
bazel run @bis//:setup -- --target //srcs/ios:App --optionals "--compilation_mode=dbg --cpu="ios_x86_64" --features=oso_prefix_is_pwd" --file_path srcs/ios/app.swift
# Extract for whole target
bazel run @bis//:setup -- --target //srcs/ios:App --optionals "--compilation_mode=dbg --cpu="ios_x86_64" --features=oso_prefix_is_pwd"
# Build sub target
bazel build //srcs/ios:App --compilation_mode=dbg --cpu=ios_x86_64 --features=oso_prefix_is_pwd --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis artifacts @@//srcs/ios:lib"
# Build app
bazel build //srcs/ios:App --compilation_mode=dbg --cpu=ios_x86_64 --features=oso_prefix_is_pwd --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis artifacts @@//srcs/ios:App"
# Build index dependents for sub target
bazel  build //srcs/ios:App --compilation_mode=dbg --cpu=ios_x86_64 --features=oso_prefix_is_pwd --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis all index dependents @@//srcs/ios:lib"
# Build  index dependents for whole target
bazel build //srcs/ios:App --compilation_mode=dbg --cpu=ios_x86_64 --features=oso_prefix_is_pwd --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis all index dependents @@//srcs/ios:App"
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
        --optionals OPTIONALS
                                --compilation_mode=dbg --cpu=ios_x86_64
        --target TARGET       target labels
        --file_path FILE_PATH
                                source code path
        --ignore_parsing_targets IGNORE_PARSING_TARGETS
                                skip searching compile targets
    ``` 

## Rules

### refresh_compile_commands
---
Wrapper of https://github.com/hedronvision/bazel-compile-commands-extractor.
We use it for hidding visibility under bzlmod.


### refresh_launch_json
---
Create `.vscode/launch.json` for vscode plugins
* target: ios_application
* pre_launch_task_name: pre_launch_task_name add in `.vscode/launch.json`
## Thanks to
* [zhao han](https://github.com/BarneyZhaoooo) - For his excellent icon design
