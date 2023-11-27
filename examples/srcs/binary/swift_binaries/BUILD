package(default_visibility = ["//visibility:public"])
load("@build_bazel_rules_swift//swift:swift.bzl", "swift_binary")

swift_binary(
    name = "bin",
    srcs = [
        "entrance.swift",
    ],
    deps = [
        "//srcs/shared/module_b:module_b",
        "//srcs/shared/macros:stringify",
        "@swift_argument_parser//:ArgumentParser"
    ]
)
