load(":repositories.bzl", "bis_rules_dependencies_hedron_compile_commands", "bis_rules_dependencies_xctestrunner")

def _non_module_deps_impl(module_ctx):
    bis_rules_dependencies_hedron_compile_commands()
    bis_rules_dependencies_xctestrunner()

deps_ext = module_extension(
    implementation = _non_module_deps_impl,
)
