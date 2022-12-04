BisProjInfo = provider(
    "Provides information needed to generate an bis project.",
    fields = {
        "direct_modules": """\
A `list` of direct modules(.swiftmodule, swift.modulemap) depends on.
""",
        "transitive_modules": """\
A `depset` of transitive modules(.swiftmodule, swift.modulemap) depends on.
""",
    }
)