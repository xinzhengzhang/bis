load("@build_bazel_rules_apple//apple:providers.bzl", "AppleBundleInfo")

def _refresh_launch_json(ctx):
    
    # Launch configurations
    launch_items = []

    target = ctx.attr.target
    bundle_info = target[AppleBundleInfo]
    launch_items.append(struct(
        name = "Launch",
        type = "lldb",
        request = "launch",
        program = '${workspaceFolder}/'+ "{}/Payload/{}.app".format(bundle_info.archive_root, bundle_info.bundle_name),
        iosBundleId = bundle_info.bundle_id,
        iosTarget = "select",
        preLaunchTask = "bis.build: build",
        sourceMap = {"./": "${workspaceFolder}"}
    ))
    launch_items.append(struct(
        name = "Attach",
        type = "lldb",
        request = "attach",
        program = "${workspaceFolder}/"+ "{}/Payload/{}.app".format(bundle_info.archive_root, bundle_info.bundle_name),
        iosBundleId = bundle_info.bundle_id,
        iosTarget = "select",
        sourceMap = {"./": "${workspaceFolder}"}
    ))
    launch_configuration = struct(
        version = "2.0.0",
        configurations = launch_items
    )
    
    output = ctx.actions.declare_file("{}-runner.py".format(ctx.attr.name))

    ctx.actions.expand_template(
        template = ctx.file._runner_template,
        output = output,
        is_executable = True,
        substitutions = {
            "%config_name%": "launch.json",
            "%json_items%": json.encode_indent(launch_configuration, indent='  '),
        },
    )

    return [
        DefaultInfo(
            executable = output,
        ),
    ]

refresh_launch_json = rule(
    implementation = _refresh_launch_json,
    attrs = {
        "target": attr.label(
            mandatory = True,
            providers = [AppleBundleInfo],
        ),
       "_runner_template": attr.label(
            allow_single_file = True,
            default = Label("//:json.template.py"),
        ), 
    },
    executable = True,
)