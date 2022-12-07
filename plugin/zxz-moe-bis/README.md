# zxz-moe-bis

The plugin is used in conjunction with rules [bis](github.com:xinzhengzhang/bis)

It provides the IDE to develop iOS application which compiled by [rules_apple](http://github.com/bazelbuild/rules_apple)

---
## Features

* Necessary UI for configure iOS project
* Extract source info from build target and generate `compile_commands.json` for Sourcekit-lsp
* Generate `launch.json` for debug

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

    Notice: it may affect the bazel-out symbol link

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

## Release Notes

### 0.0.6
* Fix target path validation in inputer
* Change validationSeverity from Error to Warning

### 0.0.5
Optimization
* Speed up the generation of launch.json
* Change default action in iosTarget from `select` to `last-selected`
* Change default value of simulator cpu from `""` to `"ios_x86_64"`

Features:
* Add some extension settings
    1. Custom pre launch task name
    2. Custom build options append on `bazel build`
* Automatic merge of `compile_commands.json`
    * Default rolling size is `300000000`
    * Set it to `0` turn off the automatic merge

### 0.0.4
Features:
* Support background refreshing

### 0.0.3
* fix wrong registation

### 0.0.2
* Change activationEvents to `workspaceContains:WORKSPACE`
* Change bis.auto_generate_launch_json default value to `false`
* Filter supported file extension(.m | .swift | .mm) for refreshing `compile_commands`.json
    * Since most projects use modules, most of them cannot find the inputs containt '.h'. So for the header file it is recommended to build an index by directly including his source file（.m & .mm)
### 0.0.1

Initial release

## For more information

* [Bazel](http://bazel.build)
* [rules_apple](http://github.com/bazelbuild/rules_apple)
* [Sourcekit-lsp](https://github.com/apple/sourcekit-lsp)

**Enjoy!**
