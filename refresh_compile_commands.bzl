# We need to adapt in time beacause we are using private rules
load("@hedron_compile_commands//:refresh_compile_commands.bzl", hedron_refresh_compile_commands = "refresh_compile_commands")

load(":providers.bzl", "BisProjInfo")
load(":bisproject_aspect.bzl", "bis_aspect")
load("@build_bazel_rules_apple//apple/internal:transition_support.bzl", "transition_support")

def _refresh_compile_commands_imp(ctx):
    # Prebuild modules
    depfiles = depset([]
        , transitive = [
            target[BisProjInfo].transitive_modules
            for target in ctx.attr.targets])

    target_outputs = depset([], transitive = [target[DefaultInfo].files for target in ctx.attr.targets]) if ctx.attr.build_artifacts else depset([])

    # Extractor 
    extractor = ctx.attr.extractor
    extractor_sources = extractor[PyInfo].transitive_sources.to_list()
    if len(extractor_sources) != 1:
        fail("extractor should only have one main py file")

    extractor_source_name = extractor_sources[0].short_path

    output = ctx.actions.declare_file("{}-runner.py".format(ctx.attr.name))

    ctx.actions.expand_template(
        template = ctx.file._runner_template,
        output = output,
        is_executable = True,
        substitutions = {
            "%python_sources%": extractor_source_name,
            "%filter_file_path%": ctx.attr.filter_file_path,
        },
    )

    return [
        DefaultInfo(
            executable = output,
            runfiles = ctx.runfiles(
                files = extractor_sources + depfiles.to_list(),
            ),
            files = target_outputs
        ),
    ]


_refresh_compile_commands_ios_cfg = rule(
    implementation = _refresh_compile_commands_imp,
    cfg = transition_support.apple_rule_transition,
    attrs = {
        "targets": attr.label_list(
            mandatory = True,
            allow_empty = True,
            aspects = [bis_aspect],
            cfg = apple_common.multi_arch_split,
        ),
        "extractor": attr.label(mandatory = True),
        "build_artifacts": attr.bool(default = False),
        "filter_file_path": attr.string(default = ".*"),
        "_runner_template": attr.label(
            allow_single_file = True,
            default = Label("//:runner.template.py"),
        ),

        "platform_type": attr.string(default = "ios"),
        "minimum_os_version": attr.string(default = "11.0"),

        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
    },
    executable = True,
)

def refresh_compile_commands_ios_cfg(name, targets, pre_compile_targets, optionals = "", file_path = ".*", build_artifacts = False, minimum_os_version = "11.0", **kwargs):
    extractor_name = name + "_extractor"

    hedron_refresh_compile_commands(
        name = extractor_name,
        targets = { target : optionals for target in targets },
        **kwargs
    )

    _refresh_compile_commands_ios_cfg(
        name = name,
        targets = pre_compile_targets,
        extractor = extractor_name,
        build_artifacts = build_artifacts,
        minimum_os_version = minimum_os_version,
        filter_file_path = file_path,
        testonly = True,
    )


_refresh_compile_commands = rule(
    implementation = _refresh_compile_commands_imp,
    attrs = {
        "targets": attr.label_list(
            mandatory = True,
            allow_empty = True,
            aspects = [bis_aspect],
        ),
        "extractor": attr.label(mandatory = True),
        "build_artifacts": attr.bool(default = False),
        "filter_file_path": attr.string(default = ".*"),
        "_runner_template": attr.label(
            allow_single_file = True,
            default = Label("//:runner.template.py"),
        ),
    },
    executable = True,
)

def refresh_compile_commands(name, targets, pre_compile_targets, optionals = "", file_path = ".*", build_artifacts = False, **kwargs):
    extractor_name = name + "_extractor"

    hedron_refresh_compile_commands(
        name = extractor_name,
        targets = { target : optionals for target in targets },
        **kwargs
    )

    _refresh_compile_commands(
        name = name,
        targets = pre_compile_targets,
        extractor = extractor_name,
        build_artifacts = build_artifacts,
        filter_file_path = file_path,
        testonly = True,
    )
