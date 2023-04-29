load("@build_bazel_rules_swift//swift:swift.bzl",
    "swift_library"
)

load(
  "@build_bazel_rules_apple//apple:ios.bzl",
  "ios_unit_test",
)

swift_library(
    name = "swift_tests",
    srcs = [
        "unittest.swift",
    ],
    testonly = True,
)

objc_library(
    name = "oc_tests",
    srcs = [
        "unittest.m",
    ],
    testonly = True,
)


ios_unit_test(
    name = "ios_app_test",
    minimum_os_version = "12.0",
    deps = [
        ":swift_tests",
        ":oc_tests"
    ],
    test_host = "//srcs/ios:App",
    # Set provisioning_profile if using real device
    # provisioning_profile = "//srcs/ios:debug.mobileprovision"
)

ios_unit_test(
    name = "ios_logic_test",
    minimum_os_version = "12.0",
    deps = [
        ":swift_tests",
        ":oc_tests"
    ],
)

