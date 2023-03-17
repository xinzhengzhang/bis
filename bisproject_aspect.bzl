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
    modules = []
    is_swift = SwiftInfo in target
    if is_swift:
        modules = [module for module in target[DefaultInfo].files.to_list() if module.extension in ["h", "swiftmodule"]]

    transitive_infos = _transitive_infos(ctx = ctx)
    infos = [info for attr, info in transitive_infos]
    transitive_modules = depset(modules, transitive = [info.transitive_modules for info in infos])

    return [BisProjInfo(
        direct_modules = modules,
        transitive_modules = transitive_modules,
    )]


bis_aspect = aspect(
    implementation = _bis_aspect_impl,
    attr_aspects = ["*"],
)