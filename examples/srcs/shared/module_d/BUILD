load("@build_bazel_rules_swift//mixed_language:mixed_language_library.bzl", "mixed_language_library")

mixed_language_library(
    name = "module_d",
    swift_srcs = [
        "module_d.swift",
    ],
    clang_srcs = [
        "module_d.m",
    ],
    hdrs = [
        "module_d.h",
    ],
    module_name = "srcs_shared_module_d_module_d",
    visibility = ["//visibility:public"],
)