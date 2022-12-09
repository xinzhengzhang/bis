load("@build_bazel_rules_apple//apple:providers.bzl", "AppleBundleInfo")

def _extract_target_info(ctx):
    is_ios = AppleBundleInfo in ctx.attr.target
    minimum_os_version = ""
    if is_ios:
        minimum_os_version = ctx.attr.target[AppleBundleInfo].minimum_os_version
    output = ctx.actions.declare_file("{}-extract.py".format(ctx.attr.name))
    x = ('#!/usr/bin/env python3\n\nprint("""{"is_ios": %s, "minimum_os_version": "%s"}""")' % ("true" if is_ios else "false", minimum_os_version))

    ctx.actions.write(output, x, is_executable = True)

    return [
        DefaultInfo(
            executable = output,
        ),
    ]

extract_target_info = rule(
    implementation = _extract_target_info,
    attrs = {
        "target": attr.label(
            mandatory = True,
        ),
    },
    executable = True,
)