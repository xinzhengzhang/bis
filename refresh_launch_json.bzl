load("@build_bazel_rules_apple//apple:providers.bzl", "AppleBundleInfo")
load("//:bisproject_aspect.bzl", "bis_aspect")
load("//:providers.bzl", "BisProjInfo")

def _create_launch_items(target, pre_launch_task_name):
    # Return launch_items[], dep_files[]
    launch_items = []
    dep_files = []
    if not AppleBundleInfo in target:
        return launch_items, dep_files

    bundle_info = target[AppleBundleInfo]
    if bundle_info.bundle_extension == ".app":
        program = "{}{}".format(bundle_info.bundle_name, bundle_info.bundle_extension)
        # ios-debug cannot run .app so we need to convert it into executable in payload
        if bundle_info.platform_type == "ios":
            program = "Payload/{}.app".format(bundle_info.bundle_name)
            launch_items.append(struct(
                name = "Launch",
                type = "lldb",
                request = "launch",
                program = '${workspaceFolder}/'+ "{}/{}".format(bundle_info.archive_root, program),
                ipaPath = '${workspaceFolder}/'+ bundle_info.archive.path,
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
                ipaPath = '${workspaceFolder}/'+ bundle_info.archive.path,
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
    elif bundle_info.bundle_extension == ".xctest":
        bis_info = target[BisProjInfo]
        xctest_infos = bis_info.transitive_xctest_infos.to_list()
        if len(xctest_infos) != 1:
            fail("There should be only one xctest info in the target")
        xctest_info = xctest_infos[0]
        if xctest_info.xctest_run_file:
            launch_items.append(struct(
                name = "Launch",
                type = "lldb",
                sourceMap = {"./": "${workspaceFolder}"},
                preLaunchTask = "bis.build: xctest bundle outputs",
                BIS_XCTEST_RUN_FILE = xctest_info.xctest_run_file.path,
                BIS_XCTEST_IS_DEVICE = xctest_info.xctest_is_device,
            ))
            dep_files.append(xctest_info.xctest_run_file)
        else:
            launch_items.append(struct(
                name = "Launch",
                type = "lldb",
                cwd = "${workspaceFolder}",
                internalConsoleOptions = "openOnSessionStart",
                console = "internalConsole",
                sourceMap = {"./": "${workspaceFolder}"},
                preLaunchTask = "bis.build: xctest bundle outputs",
                BIS_XCTEST_BUNDLE = xctest_info.xctest_bundle.path,
                BIS_XCTEST_IS_DEVICE = xctest_info.xctest_is_device,
                BIS_XCTEST_ARCH_CPU = xctest_info.xctest_arch_cpu,
            ))
        dep_files.append(xctest_info.xctest_bundle)
    return launch_items, dep_files


def _refresh_launch_json(ctx):
    # Launch configurations
    launch_items = []
    dep_files = []

    target = ctx.attr.target
    pre_launch_task_name = ctx.attr.pre_launch_task_name
    launch_items, dep_files = _create_launch_items(target, pre_launch_task_name)

    if len(launch_items) == 0:
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
            files = depset(dep_files)
        ),
    ]

refresh_launch_json = rule(
    implementation = _refresh_launch_json,
    attrs = {
        "target": attr.label(
            mandatory = True,
            aspects = [bis_aspect],
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