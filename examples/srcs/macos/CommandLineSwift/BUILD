load(
    "@build_bazel_rules_apple//apple:macos.bzl",
    "macos_command_line_application",
)
load(
    "@build_bazel_rules_apple//apple:versioning.bzl",
    "apple_bundle_version",
)
load(
    "@build_bazel_rules_swift//swift:swift.bzl",
    "swift_library",
)

swift_library(
    name = "Sources",
    srcs = ["Sources/main.swift"],
    deps = [
        "//srcs/shared/module_a:module_a"
    ]
)

apple_bundle_version(
    name = "CommandLineSwiftVersion",
    build_version = "1.0",
)

macos_command_line_application(
    name = "CommandLineSwift",
    bundle_id = "com.example.command-line-swift",
    infoplists = [":Info.plist"],
    minimum_os_version = "10.11",
    version = ":CommandLineSwiftVersion",
    deps = [":Sources"],
)
