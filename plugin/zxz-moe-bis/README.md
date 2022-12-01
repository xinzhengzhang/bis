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

### First Initialize
* generate `.vscode/tasks.json`
    * command + shift + p `>Setup bis project`
* generate `.vscode/launch.json`
    * command + shift + b

### Switch to `Run and Debug`
* `.vscode/launch.json` will auto refresh when running and debugging

---

## Exatension Commands
This extension contributes the following commands:
* Setup bis project: `zxz-moe-bis.setup`
    * generate `.vscode/tasks.json`

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

* `bis.prebuild_swift_when_indexing`

    Prebuild swiftmodule used in compile commands

---
## How bis work

1. It bridged rules_apple with CodeLLDB and generate `launch.json` automatically
2. It generate and refresh `compile_commands.json` automatically which is provided to SourceKit-lsp embed in [swift extension](https://marketplace.visualstudio.com/items?itemName=sswg.swift-lang)

## Acknowledge

* It only support ios_application for now

## Release Notes

### 0.0.1

Initial release of ...

---

## For more information

* [Bazel](http://bazel.build)
* [rules_apple](http://github.com/bazelbuild/rules_apple)
* [Sourcekit-lsp](https://github.com/apple/sourcekit-lsp)

**Enjoy!**
