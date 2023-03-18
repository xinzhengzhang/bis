BisProjInfo = provider(
    "Provides information needed to generate an bis project.",
    fields = {
        "direct_index_dependents": """\
A `list` of direct generate files(.swiftmodule, swift.modulemap, -Swift.h) depends on.
""",
        "transitive_index_dependents": """\
A `depset` of transitive generate files(.swiftmodule, swift.modulemap, -Swift.h) depends on.
""",
        "direct_outputs": """\
A `list` of direct outputs((str(target), target[DefaultInfo].files)).
""",
        "transitive_outputs": """\
A `depset` of transitive outputs((str(target), target[DefaultInfo].files)).
""",
    }
)