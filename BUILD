load("//:template_generator.bzl", "template_generator")
exports_files(["json.template.py", "bis_setup.template.py"])


py_binary(
    name = "setup",
    srcs = [":template_generator.py"],
    main = ":template_generator.py",
    tags = ["manual"],
)

template_generator(
    name = "template",
    output = "template_generator.py"
)