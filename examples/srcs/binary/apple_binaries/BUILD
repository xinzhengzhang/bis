load(
    "@build_bazel_rules_apple//apple/internal:apple_universal_binary.bzl", "apple_universal_binary",
)
apple_universal_binary(
    name = "universal_binary",
    binary = "//srcs/binary/swift_binaries:bin",
    # if you are using forced_cpus you have to put `x86_64` at end of the list
    forced_cpus = ["arm64", "x86_64"],
    minimum_os_version = "11.0",
    platform_type = "macos",
)