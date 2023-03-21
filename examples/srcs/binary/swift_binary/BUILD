load("@build_bazel_rules_swift//swift:swift.bzl",
    "swift_binary"
)


swift_binary(
    name = "bin",
    srcs = [
        "main.swift",
    ],
    deps = [
        "//srcs/module_c:module_c"
    ]
)
