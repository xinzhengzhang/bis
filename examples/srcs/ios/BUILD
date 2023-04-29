load("@build_bazel_rules_swift//swift:swift.bzl",
    "swift_library"
)

load(
  "@build_bazel_rules_apple//apple:ios.bzl",
  "ios_application",
)

exports_files(glob(["*.mobileprovision"]))

swift_library(
    name = "lib",
    srcs = [
        "app.swift",
    ],
    deps = [
        "//srcs/shared/module_a:module_a",
        "//srcs/shared/module_d:module_d",
    ]
)

ios_application(
    name = "App",
    bundle_id = "com.example.app",
    families = ["iphone", "ipad"],
    infoplists = [":Info.plist"],
    minimum_os_version = "15.0",
    deps = [":lib"],
    # Set provisioning_profile if using real device
    # provisioning_profile = ":debug.mobileprovision",
    visibility = ["//visibility:public"],
)
