load(
    "@build_bazel_rules_apple//apple/internal:apple_universal_binary.bzl", "apple_universal_binary",
)

apple_universal_binary(
    name = "universal_binary",
    binaries = [
        ":binary_arm64",
        ":binary_x86_64",
    ],
    forced_cpus = ["x86_64", "arm64"],
    minimum_os_version = "10.0",
    platform_type = "macos",
)