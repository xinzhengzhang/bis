# We need to adapt in time beacause we are using private rules
load("@hedron_compile_commands//:refresh_compile_commands.bzl", hedron_refresh_compile_commands = "refresh_compile_commands")

load(":providers.bzl", "BisProjInfo")
load(":bisproject_aspect.bzl", "bis_aspect")

def _refresh_compile_commands_imp(ctx):
    
    # Prebuild modules
    modules = depset([])
    if ctx.attr.pre_compile_swift_module:
        modules = depset([], transitive = [target[BisProjInfo].transitive_modules for target in ctx.attr.targets])

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
        },
    )

    return [
        DefaultInfo(
            files = modules,
            executable = output,
            runfiles = ctx.runfiles(
                files = extractor_sources,
            ),
        ),
    ]


_refresh_compile_commands = rule(
    implementation = _refresh_compile_commands_imp,
    attrs = {
        "targets": attr.label_list(
            mandatory = True,
            allow_empty = True,
            aspects = [bis_aspect],
        ),
        "extractor": attr.label(mandatory = True),
        "pre_compile_swift_module": attr.bool(default = True),
        "_runner_template": attr.label(
            allow_single_file = True,
            default = Label("//:runner.template.py"),
        ),
        
    },
    executable = True,
)

def refresh_compile_commands(name, targets, optionals = "", file_path = ".*", pre_compile_swift_module = True, **kwargs):
    extractor_name = name + "_extractor"

    hedron_refresh_compile_commands(
        name = extractor_name,
        targets = { target : optionals for target in targets },
        enable_swift = True,
        input_filter = file_path,
        **kwargs 
    )

    _refresh_compile_commands(
        name = name,
        targets = targets,
        extractor = extractor_name,
        pre_compile_swift_module = pre_compile_swift_module,
    )
