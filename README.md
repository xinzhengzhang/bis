# bis
Bazel rule for developing iOS project on vscode

# Setup
```WORKSPACE
load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')

git_repository(
    name = "bis",
    remote = "git@github.com:xinzhengzhang/bis.git",
    branh = "main",
)
```

# Setup

## Install plugin
```
# install ios-debug plugin
code --install-extension nisargjhaveri.ios-debug
# install swift plugin（sourcekit-lsp)
code --install-extension sswg.swift-lang

```

## First Initiailize
```
# .vscode/tasks.json
# .bis/BUILD
bazel run @bis//:setup

# .vscode/launch.json
code .
command + shift + B (Tasks: Run Build Task)
```
