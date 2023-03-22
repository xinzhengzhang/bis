# Wrapped the hedron_refresh_compile_commands for hiding visibility
load("@hedron_compile_commands//:refresh_compile_commands.bzl", hedron_refresh_compile_commands = "refresh_compile_commands")

def refresh_compile_commands(name, targets,  optionals = "", **kwargs):
    hedron_refresh_compile_commands(
        name = name,
        targets = { target : optionals for target in targets },
        **kwargs
    )
