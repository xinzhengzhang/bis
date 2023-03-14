# Change Log

## [Unreleased]

### 0.2.3
Revert
* 0.2.1 Most projects will have package problem exceptions, and using too strict cquery will cause the problem of not being able to query. If you use bzlmod, add query `--enable_bzlmod` in the bazelrc of the project

### 0.2.2
Enhance
* Use smaller granularity to detect if bis is in the project

### 0.2.1
Enhance
* Since bazel query has not yet supported bzlmod, most of the implementations have been modified to cquery

### 0.2.0
Features
* Compatible with [InjectionIII](https://github.com/johnno1962/InjectionIII)
* Add setting `bis.auto_refresh_dummy_project_for_InjectionIII` for auto refreshing compile commands used by hot reload

Commands
* Add `zxz-moe-bis.refreshDummyProjectForInjectionIII` for refreshing dummy project and compile commands used by hotreload

Enhance
* Optimize the logic of detecting whether it is a bis project
* Using poll targetSDK to achieve the purpose of observation

### 0.1.8
* Add configuration `target_query_kind_filter` for specifying rules kind which will be queried in target selection

### 0.1.7
Features
* Add configuration `query_kind_filter` for specifying rules kind which will be queried
* In order to prevent intrusion into other bazel projects only start to set the cpu strings after the bis rules are detected

Thanks
* [MilkerLiu](https://github.com/MilkerLiu)

### 0.1.6
Features
* Copy target path from BUILD file
* Show target dependencies
* Specify WORKSPACE(bazel) root on demand

### 0.1.5
Features
* Add option `bis.startup_options`
    
    Customize bazel startup options
    like `custom.bazelrc`
### 0.1.4
Features
* Redesign bis.auto_generate_launch_json

    Now the default value is `true`

    The flag meaning is changing to automatically update launch.json when the configuration changes. (build_target, compilation_mode, host_target)
* Inputer: query all ios_application as potential options

Changes
* Remove error prone flag `bazel_background_output_base`

### 0.1.3
Features:
* support extension `[".swift", ".m", ".mm", ".c", ".cc", ".cpp", ".cxx", ".c++", ".C", ".CC", ".CPP", ".CXX", ".C++"]`

### 0.1.2
Features
* bis.check_duplicate_compile_commands

    Whether to ignore repeated refresh commands.

    Note: Different compilation parameters will still reuse the same copy. It doesn't matter in most cases, you can choose to delete the local ./compile_commands.json or disable it

### 0.1.1 
* Add much more log

### 0.1.0
* Remove pre_launch_task_name in setup.py set it to `$${config:bis.pre_launch_task_name}`

### 0.0.10
* Set last value into inputer when clicked
* Do not display logs when refreshing commands
* bis.bazel_background_output_base set to '' to disable background refreshing

### 0.0.9
* Fix that UI overlaps each other when extract build target and pre build task
* Show error if file not in target's dependencies
* Adapt to multiple workspaces

### 0.0.8
* minor update

### 0.0.7
* Differentiate target between ios with others and set the correct configuration to it for sharing the build cache
* Auto provides build task that are depended on the build target (Try `command + shift + b`)

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
* Initial release