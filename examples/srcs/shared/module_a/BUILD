package(default_visibility = ["//visibility:public"])
objc_library(
    name = "module_a",
    srcs = [
        "a.m",
        "sub_module_b/sub_b.h",
        "sub_module_b/sub_b.m",
    ],
    hdrs = [
        "include/a.h",
    ],
    copts = [
        "-iquote srcs/shared/module_a/sub_module_b",
    ],
    includes = ["include"],
    visibility = ["//visibility:public"],
)
