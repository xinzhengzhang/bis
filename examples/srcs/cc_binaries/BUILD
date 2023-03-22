cc_library(
    name = "main",
    srcs = ["module_c_test.cc"],
    implementation_deps = [
        "//srcs/shared/module_c:module_c"
    ],
)
cc_test(
    name = "module_c_test",
    deps = [
        ":main",
    ],
)

cc_binary(
    name = "module_c_binary",
    srcs = ["module_c_test.cc"],
    deps = [
        ":main",
    ],
)
