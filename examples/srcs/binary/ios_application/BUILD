load("@build_bazel_rules_swift//swift:swift.bzl",
    "swift_library"
)

load(
  "@build_bazel_rules_apple//apple:ios.bzl",
  "ios_application",
)

swift_library(
    name = "lib",
    srcs = [
        "app.swift",
    ],
    deps = [
        "//srcs/module_a:module_a"
    ]
)

ios_application(
    name = "App",
    bundle_id = "com.example.app",
    families = ["iphone", "ipad"],
    infoplists = [":Info.plist"],
    minimum_os_version = "15.0",
    deps = [":lib"],
)
