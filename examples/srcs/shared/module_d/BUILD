load("@build_bazel_rules_apple//mixed_language:mixed_language_library.bzl", "mixed_language_library")

mixed_language_library(
    name = "module_d",
    srcs = [
        "module_d.m",
        "module_d.swift",
    ],
    hdrs = [
        "module_d.h",
    ],
    module_name = "srcs_shared_module_d_module_d",
    visibility = ["//visibility:public"],
)