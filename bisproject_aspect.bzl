load(":providers.bzl", "BisProjInfo")
load("@build_bazel_rules_swift//swift:swift.bzl", "SwiftInfo")

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
    direct_index_dependents = []
    direct_outputs = [("bis artifacts {}".format(target.label), target.files)]

    is_swift = SwiftInfo in target
    if is_swift:
        direct_index_dependents = [direct_index_dependent for direct_index_dependent in target[DefaultInfo].files.to_list() if direct_index_dependent.extension in ["h", "swiftmodule"]]

    transitive_infos = _transitive_infos(ctx = ctx)
    infos = [info for attr, info in transitive_infos]

    transitive_index_dependents = depset(direct_index_dependents, transitive = [info.transitive_index_dependents for info in infos])
    transitive_outputs = depset(direct_outputs, transitive = [info.transitive_outputs for info in infos])

    output_groups = {k: v for k, v in transitive_outputs.to_list()}

    artifacts_labels_file = ctx.actions.declare_file("{}_bis_artifacts_labels.txt".format(target.label.name))
    ctx.actions.write(artifacts_labels_file, '\n'.join(list(output_groups.keys())))
    output_groups["bis artifacts labels"] =  [artifacts_labels_file]

    return [
        BisProjInfo(
            direct_index_dependents = direct_index_dependents,
            transitive_index_dependents = transitive_index_dependents,
            direct_outputs = direct_outputs,
            transitive_outputs = transitive_outputs
        ),
        OutputGroupInfo(**output_groups),
    ]


bis_aspect = aspect(
    implementation = _bis_aspect_impl,
    attr_aspects = ["*"],
)
