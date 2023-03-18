load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load('@bazel_tools//tools/build_defs/repo:git.bzl', 'git_repository')

def _maybe(repo_rule, name, **kwargs):
    """Executes the given repository rule if it hasn't been executed already.

    Args:
      repo_rule: The repository rule to be executed (e.g., `http_archive`.)
      name: The name of the repository to be defined by the rule.
      **kwargs: Additional arguments passed directly to the repository rule.
    """
    if not native.existing_rule(name):
        repo_rule(name = name, **kwargs)

def bis_rules_dependencies_hedron_compile_commands(remote = "git@github.com:hedronvision/bazel-compile-commands-extractor.git"):
    git_repository(
        name = "hedron_compile_commands",
        remote = remote,
        commit = "f02c9a82e4ea166584a7e2e58d566872121fba7c",
        patch_args = ["-p1"],
        patches = [
            ":patches/file_filter.patch",
            ":patches/swift_support.patch"
        ]
    )


def bis_rules_dependencies():

    _maybe(
        http_archive,
        name = "build_bazel_rules_apple",
        sha256 = "f94e6dddf74739ef5cb30f000e13a2a613f6ebfa5e63588305a71fce8a8a9911",
        url = "https://github.com/bazelbuild/rules_apple/releases/download/1.1.3/rules_apple.1.1.3.tar.gz",
    )

    if not native.existing_rule("hedron_compile_commands"):
        bis_rules_dependencies_hedron_compile_commands()
