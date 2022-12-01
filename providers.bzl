BisProjInfo = provider(
    "Provides information needed to generate an bis project.",
    fields = {
        "direct_swift_modules": """\
A `list` of direct swift_modules depends on.
""",
        "transitive_swift_modules": """\
A `depset` of transitive swift_modules depends on.
""",
    }
)