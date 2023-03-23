# zxz-moe-bis

The plugin is used in conjunction with rules [bis](github.com:xinzhengzhang/bis)

This plugin provides the ability to develop in the Apple ecosystem using Bazel.

| Platform | Rule | Editor Features | Debugging |
|------|-----|--------|--------|
| MacOSX | macos_application  | ✅  | ✅  |
| MacOSX | macos_command_line_application  | ✅  | ✅  |
| MacOSX | cc_binary  | ✅   | ✅   |
| MacOSX | swift_binary  | ✅  | ✅   |
| MacOSX | apple_universal_binary  | ✅  |  ✅   |
| MacOSX | cc_test  | ✅   | ✅   |
| iPhoneOS | ios_application  | ✅  | ✅  |
| iPhoneOS | ios_ui_test  | ✅  | ❌  |
| iPhoneOS | ios_unit_test  | ✅ | ❌ |
| iPhoneSimulator | ios_application  | ✅  | ✅ |
| iPhoneSimulator | ios_ui_test  | ✅  | ❌  |
| iPhoneSimulator | ios_unit_test  | ✅ | ❌ |
| iPhoneOS | ios_application  | ✅  | ✅  |
| / | cc_library  | ✅ | ✅ |
| / | objc_library  | ✅ | ✅ |
| / | swift_library  | ✅ | ✅ |

Editor features was provided by sourcekit-lsp embed in `sswg.swift-lang` The main function of this plugin is to generate dependents(like compile_commands.json modulemap swiftmodule) used in LSP (Language Server Protocol) as quickly as possible through the current build target.

It theoretically supports all rules of languages that can be supported by sourcekit-lsp and clangd, but I have not tested it. If you find any that can be used, please add them to the examples and expand the list.

As an iOS developer, I urgently hope to use the debugging ability of XCTest. If you have any ideas, welcome to discuss it by implementing it through the .xctest bundle.

---
## Features

* UE for apple developing
* Tree viewer for buildable targets
* Extract source info from build target and generate `compile_commands.json` for Sourcekit-lsp
* Generate `launch.json` for debug
* Copy target path from BUILD file
* Show target dependencies
    * Install graphviz before using this feature
    * https://blog.bazel.build/2015/06/17/visualize-your-build.html
* Auto provides build task that are depended on the build target `command + shift + b`

---
## Requirements

* [bazel](http://github.com/bazelbuild/bazel)

---
## Usage

* Import bis rules in your MODULE.bazel
    ```
    # MODULE.bazel
    bazel_dep(name = "bis", version = "0.3.0", dev_dependency = True)
    archive_override(
        module_name = "bis",
        urls = "https://github.com/xinzhengzhang/bis/archive/refs/tags/0.3.0.tar.gz",
        strip_prefix = "bis-0.3.0"
    )

    # If you are not in bzlmod please check the bis rules README.md
    ```
* Generate `.vscode/launch.json`
    * command + shift + p `>generate bis launch json`
* Refresh tree viewer manually
    * command + shift + p `>refresh tree viewer`
* Generate dummy project for hotreloading used in InjectionIII.app
    * command + shift +p `>refresh dummy project for InjectionIII`
---

## Usage Visuals
![out_2](https://user-images.githubusercontent.com/1487445/209274772-9b0e8230-dd9c-47ef-86f6-e295d5ae4451.gif)
![out_1](https://user-images.githubusercontent.com/1487445/209274776-b4c8c7b3-0b1b-4376-88c4-c1739422fc90.gif)

---
## Extension Commands
This extension contributes the following commands:
* Setup bis project: `zxz-moe-bis.generateLaunchJson`
    * generate `.vscode/launch.json`

        Notice: the target must have mandatory providers: 'AppleBundleInfo'

* Refresh tree viewer: `zxz-moe-bis.refreshTreeViewer`

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

---
## Extension Settings

This extension contributes the following settings:

* `bis.auto_generate_launch_json`

    Auto generate .vscode/launch.json when configuration changing deteched 

* `bis.check_duplicate_compile_commands`

    Whether to ignore repeated refresh commands. Note: Different compilation parameters will still reuse the same copy. It doesn't matter in most cases, you can choose to delete the local ./compile_commands.json or disable it

* `bis.simulator_cpu_string`

    Default cpu string for simulator ( | ios_x86_64)

* `bis.pre_launch_task_name`

    Task executed before launch. Default value is bis.build: build
    
    We can specify custom build task

* `bis.build_options`
    
    Custom build options append to `bazel build`

* `bis.startup_options`

    Custom startup options append to `bazel`

* `bis.compile_commands_rolling_size`
    
    Less than it would merge `compile_commands.json` automatically
    We can it to 0 if we don't want to auto merge

---
## How bis work

1. It bridged rules_apple with CodeLLDB and generate `launch.json` automatically
2. It generate and refresh `compile_commands.json` automatically which is provided to SourceKit-lsp embed in [swift extension](https://marketplace.visualstudio.com/items?itemName=sswg.swift-lang)

---
## Frequently Asked Questions

* Why is my swift code hinting not working?

   We need to disable some features like `--features=swift.vfsoverlay` `--features=swift.use_explicit_swift_module_map` because sourcekit-lsp does not fully support the full set of swift features.

* Why is my `jump to swift modules` not working?

    We need to build a `sourcekit-lsp` version which more closer to the trunk and includes `https://github.com/apple/sourcekit-lsp/pull/668` and set it to the settings which named `Sourcekit-lsp: Server Path`

    ```
        git clone git@github.com:apple/sourcekit-lsp.git
        export TOOLCHAINS=swift
        swift package update
        swift build
    ```



## For more information

* [Bazel](http://bazel.build)
* [rules_apple](http://github.com/bazelbuild/rules_apple)
* [Sourcekit-lsp](https://github.com/apple/sourcekit-lsp)

**Enjoy!**
