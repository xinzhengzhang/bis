load("@build_bazel_rules_apple//apple:providers.bzl", "AppleBundleInfo")

def _refresh_launch_json(ctx):
    
    # Launch configurations
    launch_items = []

    target = ctx.attr.target
    pre_launch_task_name = ctx.attr.pre_launch_task_name

    if AppleBundleInfo in target:
        bundle_info = target[AppleBundleInfo]
        program = "{}{}".format(bundle_info.bundle_name, bundle_info.bundle_extension)

        # ios-debug cannot run .app so we need to convert it into executable in payload
        if bundle_info.platform_type == "ios":
            program = "Payload/{}.app".format(bundle_info.bundle_name)
            launch_items.append(struct(
                name = "Launch",
                type = "lldb",
                request = "launch",
                program = '${workspaceFolder}/'+ "{}/{}".format(bundle_info.archive_root, program),
                iosBundleId = bundle_info.bundle_id,
                iosTarget = "last-selected",
                preLaunchTask = pre_launch_task_name,
                sourceMap = {"./": "${workspaceFolder}"}
            ))
            launch_items.append(struct(
                name = "Attach",
                type = "lldb",
                request = "attach",
                program = '${workspaceFolder}/'+ "{}/{}".format(bundle_info.archive_root, program),
                iosBundleId = bundle_info.bundle_id,
                iosTarget = "last-selected",
                sourceMap = {"./": "${workspaceFolder}"}
            ))
        elif bundle_info.platform_type == "macos":
            program = "{}.app".format(bundle_info.bundle_name)
            launch_items.append(struct(
                name = "Launch",
                type = "lldb",
                request = "launch",
                program = '${workspaceFolder}/'+ "{}/{}".format(bundle_info.archive_root, program),
                preLaunchTask = pre_launch_task_name,
                sourceMap = {"./": "${workspaceFolder}"}
            ))
            launch_items.append(struct(
                name = "Attach",
                type = "lldb",
                request = "attach",
                program = '${workspaceFolder}/'+ "{}/{}".format(bundle_info.archive_root, program),
                sourceMap = {"./": "${workspaceFolder}"}
            ))

    else:
        # We should assert that if the files do not exist, we should not create a launch configuration. So just throw an exception
        launch_items.append(struct(
            name = "Launch",
            type = "lldb",
            request = "launch",
            program = '${workspaceFolder}/'+ target.files.to_list()[0].path,
            preLaunchTask = pre_launch_task_name,
            sourceMap = {"./": "${workspaceFolder}"}
        ))
        launch_items.append(struct(
            name = "Attach",
            type = "lldb",
            request = "attach",
            program = '${workspaceFolder}/'+ target.files.to_list()[0].path,
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
        ),
        "pre_launch_task_name": attr.string(
            default = "${config:bis.pre_launch_task_name}"
        ),
        "_runner_template": attr.label(
            allow_single_file = True,
            default = Label("//:json.template.py"),
        ), 
    },
    executable = True,
)