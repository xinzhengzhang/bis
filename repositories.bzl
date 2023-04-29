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
        commit = "f7388651ee99608fb5f6336764657596e2f84b97",
        patch_args = ["-p1"],
        patches = [
            ":patches/file_filter.patch",
            ":patches/swift_support.patch"
        ]
    )

def bis_rules_dependencies_xctestrunner(mirror_host = ""):
    hosts = ["github.com"]
    if len(mirror_host) > 0:
        hosts.insert(0, mirror_host)
    urls = ["https://{}/google/xctestrunner/archive/24629f3e6c0dda397f14924b64eb45d04433c07e.tar.gz".format(host) for host in hosts]
    http_archive(
        name = "xctestrunner",
        urls = urls,
        strip_prefix = "xctestrunner-24629f3e6c0dda397f14924b64eb45d04433c07e",
        sha256 = "6e692722c3b3d5f2573357870c78febe8419b18ab28565bc6a1d9ddd28c8ec51",
    )

def bis_rules_dependencies():

    _maybe(
        http_archive,
        name = "build_bazel_rules_apple",
        sha256 = "3e2c7ae0ddd181c4053b6491dad1d01ae29011bc322ca87eea45957c76d3a0c3",
        url = "https://github.com/bazelbuild/rules_apple/releases/download/2.1.0/rules_apple.2.1.0.tar.gz",
    )

    if not native.existing_rule("hedron_compile_commands"):
        bis_rules_dependencies_hedron_compile_commands()
    if not native.existing_rule("xctestrunner"):
        bis_rules_dependencies_xctestrunner()
