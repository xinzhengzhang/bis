load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')
load(":repositories.bzl", "bis_rules_dependencies_hedron_compile_commands", "bis_rules_dependencies_xctestrunner")

def _non_module_deps_impl(module_ctx):
    remote = ""
    for mod in module_ctx.modules:
        for remote in mod.tags.remote:
            remote = remote.remote
    if len(remote) > 0:
        bis_rules_dependencies_hedron_compile_commands(remote)
    else:
        bis_rules_dependencies_hedron_compile_commands()
    bis_rules_dependencies_xctestrunner()


remote = tag_class(attrs={
    "remote": attr.string(),
})

deps_ext = module_extension(
    implementation = _non_module_deps_impl,
    tag_classes = {"remote": remote}
)
