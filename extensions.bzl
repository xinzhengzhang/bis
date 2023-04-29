load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')
load(":repositories.bzl", "bis_rules_dependencies_hedron_compile_commands", "bis_rules_dependencies_xctestrunner")

def _non_module_deps_impl(module_ctx):
    bazel_compile_commands_extractor = ""
    mirror_host = ""

    for mod in module_ctx.modules:
        for remote in mod.tags.remote:
            bazel_compile_commands_extractor= remote.mirror_bazel_compile_commands_extractor
            mirror_host = remote.mirror_host
    if len(bazel_compile_commands_extractor) > 0:
        bis_rules_dependencies_hedron_compile_commands(bazel_compile_commands_extractor)
    else:
        bis_rules_dependencies_hedron_compile_commands()
    if len(mirror_host) > 0:
        bis_rules_dependencies_xctestrunner(mirror_host)
    else:
        bis_rules_dependencies_xctestrunner()


remote = tag_class(attrs={
    "mirror_bazel_compile_commands_extractor": attr.string(),
    "mirror_host": attr.string()
})

deps_ext = module_extension(
    implementation = _non_module_deps_impl,
    tag_classes = {"remote": remote}
)
