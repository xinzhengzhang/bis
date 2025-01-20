load(":providers.bzl", "BisProjInfo")
load("@build_bazel_rules_swift//swift:swift.bzl", "SwiftInfo")
load("@build_bazel_rules_apple//apple:providers.bzl", "IosXcTestBundleInfo", "AppleTestInfo", "AppleResourceInfo")

def _should_ignore_attr(attr):
    return (
        # We don't want to include implicit dependencies
        attr.startswith("_") or
        # These are actually Starklark methods, so ignore them
        attr in ("to_json", "to_proto")
    )

def _transitive_infos(*, ctx):
    transitive_infos = []
    for attr in dir(ctx.rule.attr):
        if _should_ignore_attr(attr):
            continue

        dep = getattr(ctx.rule.attr, attr)
        if type(dep) == "list":
            for dep in dep:
                if type(dep) == "Target" and BisProjInfo in dep:
                    transitive_infos.append((attr, dep[BisProjInfo]))
        elif type(dep) == "Target" and BisProjInfo in dep:
            transitive_infos.append((attr, dep[BisProjInfo]))

    return transitive_infos


def _bis_aspect_impl(target, ctx):
    if ctx.rule.kind.endswith("_import"):
        # skip some imported targets (e.g. objc_import, apple_static_framework_import, apple_dynamic_framework_import, etc.)
        return []
    direct_index_dependents = []
    direct_outputs = [("bis artifacts {}".format(target.label), target.files)]
    direct_xctest_infos = []

    is_swift = SwiftInfo in target
    is_xctest = IosXcTestBundleInfo in target and AppleResourceInfo in target

    if is_swift:
        direct_index_dependents = [depset([direct_index_dependent for direct_index_dependent in target[DefaultInfo].files.to_list() if direct_index_dependent.extension in ["h", "swiftmodule"]])]
    if is_xctest:
        if AppleTestInfo not in target:
            fail("xc_test_bundle {} must also have apple_test".format(target.label))
        test_bundle = target[AppleTestInfo].test_bundle
        test_host = target[AppleTestInfo].test_host
        is_device = ctx.fragments.apple.single_arch_platform.is_device
        if test_host:
            work_dir = "{}/{}/{}_bis_xctest_bundle_output".format(ctx.bin_dir.path, target.label.package, target.label.name)
            xctest_run_file = ctx.actions.declare_file("{}_bis_xctest_bundle_output/TEST_ROOT/xctestrun.plist".format(target.label.name))
            ctx.actions.run(
                executable = ctx.executable._xctest_bundler,
                inputs = [test_bundle] + ([test_host] if test_host else []),
                outputs = [xctest_run_file],
                arguments = [
                    "--work_dir", work_dir,
                    "--test_bundle_path", test_bundle.path,
                    "--app_under_test_path", test_host.path,
                    "prepare",
                    "--platform", "ios_" + ("device" if is_device else "simulator")
                ],
                execution_requirements = {"no-sandbox": "1", "no-remote": "1"}
            )
            direct_xctest_infos = [struct(
                xctest_run_file = xctest_run_file,
                xctest_bundle = test_bundle,
                xctest_is_device = is_device,
                xctest_arch_cpu = ctx.fragments.apple.single_arch_cpu,
            )]
        else:
            direct_xctest_infos = [struct(
                xctest_run_file = None,
                xctest_bundle = test_bundle,
                xctest_is_device = is_device,
                xctest_arch_cpu = ctx.fragments.apple.single_arch_cpu,
            )]


    transitive_infos = _transitive_infos(ctx = ctx)
    infos = [info for attr, info in transitive_infos]

    transitive_index_dependents = depset(direct_index_dependents, transitive = [info.transitive_index_dependents for info in infos])
    transitive_outputs = depset(direct_outputs, transitive = [info.transitive_outputs for info in infos])
    transitive_xctest_infos = depset(direct_xctest_infos, transitive = [info.transitive_xctest_infos for info in infos])

    direct_all_index_dependents = [("bis all index dependents {}".format(target.label), transitive_index_dependents)]
    transitive_all_index_dependents = depset(direct_all_index_dependents, transitive = [info.transitive_all_index_dependents for info in infos])

    output_groups = {k: v for k, v in transitive_outputs.to_list()}
    output_groups.update({k: depset([], transitive = v.to_list()).to_list() for k, v in transitive_all_index_dependents.to_list()})

    artifacts_labels_file = ctx.actions.declare_file("{}_bis_artifacts_labels.txt".format(target.label.name))
    ctx.actions.write(artifacts_labels_file, '\n'.join(list(output_groups.keys())))
    output_groups["bis artifacts labels"] =  [artifacts_labels_file]

    # Collect all the xctest bundles
    bundle_outputs_files = [([info.xctest_run_file] if info.xctest_run_file else []) + [info.xctest_bundle] for info in transitive_xctest_infos.to_list()]
    bundle_outputs_files_flatten = [item for sublist in bundle_outputs_files for item in sublist]
    output_groups["bis xctest bundle outputs"] = bundle_outputs_files_flatten

    return [
        BisProjInfo(
            direct_index_dependents = direct_index_dependents,
            transitive_index_dependents = transitive_index_dependents,
            direct_outputs = direct_outputs,
            transitive_outputs = transitive_outputs,
            direct_all_index_dependents = direct_all_index_dependents,
            transitive_all_index_dependents = transitive_all_index_dependents,
            transitive_xctest_infos = transitive_xctest_infos
        ),
        OutputGroupInfo(**output_groups),
    ]


bis_aspect = aspect(
    implementation = _bis_aspect_impl,
    attr_aspects = ["*"],
    attrs = {
        '_xctest_bundler': attr.label(
            default = Label("@xctestrunner//:ios_test_runner"),
            executable = True,
            cfg = "exec",
        )
    },
    fragments = ["apple"]
)
