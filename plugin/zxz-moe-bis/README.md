# zxz-moe-bis

The plugin is used in conjunction with rules [bis](github.com:xinzhengzhang/bis)

It provides the IDE to develop iOS application which compiled by [rules_apple](http://github.com/bazelbuild/rules_apple)

---
## Features

* Necessary UI for configure iOS project
* Extract source info from build target and generate `compile_commands.json` for Sourcekit-lsp
* Generate `launch.json` for debug
* Auto provides build task that are depended on the build target `command + shift + b`

---
## Requirements

* [bazel](http://github.com/bazelbuild/bazel)

---
## Usage

* Import bis rules in your WORKSPACE
    ```
    load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')

    git_repository(
        name = "bis",
        remote = "git@github.com:xinzhengzhang/bis.git",
        branch = "main",
    )

    load("@bis//:repositories.bzl", "bis_rules_dependencies")

    bis_rules_dependencies()
    ```
* Generate `.vscode/launch.json`
    * command + shift + p `>Generate bis launch json`

---

## Extension Commands
This extension contributes the following commands:
* Setup bis project: `zxz-moe-bis.generateLaunchJson`
    * generate `.vscode/launch.json`

* Variable
    * `zxz-moe-bis.buildTarget`
        * Label of selected target
            
            ex: `//binary:app`
    * `zxz-moe-bis.cpu`
        * Cpu string of selected device

            ex: `ios_arm64`
    * `zxz-moe-bis.compilationMode`
        * CompilationMode string of selected mode

            ex: `dbg` or `opt`

## Extension Settings

This extension contributes the following settings:

* `bis.auto_generate_launch_json`

    Auto generate .vscode/launch.json when deteched a bis project

* `bis.prebuild_swift_when_indexing`

    Prebuild swiftmodule used in compile commands

* `bis.simulator_cpu_string`

    Default cpu string for simulator ( | ios_x86_64)

* `bis.bazel_background_output_base`

    Temporary output_base when building

    Notice: it may affect the bazel-out symbol link (Set to '' to disable it)

* `bis.pre_launch_task_name`

    Task executed before launch. Default value is bis.build: build
    
    We can specify custom build task

* `bis.build_options`
    
    Custom build options append to `bazel build`

* `bis.compile_commands_rolling_size`
    
    Less than it would merge `compile_commands.json` automatically
    We can it to 0 if we don't want to auto merge

---
## How bis work

1. It bridged rules_apple with CodeLLDB and generate `launch.json` automatically
2. It generate and refresh `compile_commands.json` automatically which is provided to SourceKit-lsp embed in [swift extension](https://marketplace.visualstudio.com/items?itemName=sswg.swift-lang)

## Acknowledge

* It only support ios_application for now

## For more information

* [Bazel](http://bazel.build)
* [rules_apple](http://github.com/bazelbuild/rules_apple)
* [Sourcekit-lsp](https://github.com/apple/sourcekit-lsp)

**Enjoy!**
