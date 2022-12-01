# We need to adapt in time beacause we are using private rules
load("@hedron_compile_commands//:refresh_compile_commands.bzl", "refresh_compile_commands")

load(":providers.bzl", "BisProjInfo")
load(":bisproject_aspect.bzl", "bis_aspect")

load("@build_bazel_rules_apple//apple:providers.bzl", "AppleBundleInfo")

def _bis_proj_runner_imp(ctx):
    
    # Prebuild files
    swift_modules = []
    if ctx.attr.pre_compile_swift_module:
        swift_modules = depset([], transitive = [target[BisProjInfo].transitive_swift_modules for target in ctx.attr.targets]).to_list()

    # Extractor 
    extractor = ctx.attr.extractor
    extractor_sources = extractor[PyInfo].transitive_sources.to_list()
    if len(extractor_sources) != 1:
        fail("extractor should only have one main py file")
    extractor_source_name = extractor_sources[0].short_path

    # Launch configurations
    launch_items = []
    for target in ctx.attr.targets:
        bundle_info = target[AppleBundleInfo]
        launch_items.append(struct(
            name = "Launch",
            type = "lldb",
            request = "launch",
            program = '${workspaceFolder}/'+ "{}/Payload/{}.app".format(bundle_info.archive_root, bundle_info.bundle_name),
            iosBundleId = bundle_info.bundle_id,
            iosTarget = "select",
            preLaunchTask = "Build",
            sourceMap = {"./": "${workspaceFolder}"}
        ))
        launch_items.append(struct(
            name = "Attach",
            type = "lldb",
            request = "attach",
            program = "${workspaceFolder}/"+ "{}/Payload/{}.app".format(bundle_info.archive_root, bundle_info.bundle_name),
            iosBundleId = bundle_info.bundle_id,
            iosTarget = "select",
            # preLaunchTask = "Build",
            sourceMap = {"./": "${workspaceFolder}"}
        ))
    launch_configuration = struct(
        version = "0.2.0",
        configurations = launch_items
    )
    
    output = ctx.actions.declare_file("{}-runner.py".format(ctx.attr.name))

    ctx.actions.expand_template(
        template = ctx.file._runner_template,
        output = output,
        is_executable = True,
        substitutions = {
            "%python_sources%": extractor_source_name,
            "%launch_items%": json.encode_indent(launch_configuration, indent='\t'),
        },
    )

    return [
        DefaultInfo(
            executable = output,
            runfiles = ctx.runfiles(
                files = extractor_sources + swift_modules,
            ),
        ),
    ]


_bis_proj_runner = rule(
    implementation = _bis_proj_runner_imp,
    attrs = {
        "targets": attr.label_list(
            mandatory = True,
            allow_empty = False,
            aspects = [bis_aspect],
            providers = [AppleBundleInfo],
        ),
        "extractor": attr.label(mandatory = True),
        "pre_compile_swift_module": attr.bool(default = False),
        "_runner_template": attr.label(
            allow_single_file = True,
            default = Label("//:runner.template.py"),
        ),
        
    },
    executable = True,
)

def bis_proj(name, targets, pre_compile_swift_module = False , optionals = "", **kwargs):
    extractor_name = name + "_extractor"

    refresh_compile_commands(
        name = extractor_name,
        targets = {target : optionals for target in targets },
        enable_swift = True,
        exclude_headers = "all",
        **kwargs 
    )

    _bis_proj_runner(
        name = name,
        targets = targets,
        extractor = extractor_name,
        pre_compile_swift_module = pre_compile_swift_module,
    )
