BisProjInfo = provider(
    "Provides information needed to generate an bis project.",
    fields = {
        "direct_index_dependents": """\
A `list` of direct generate files(.swiftmodule, swift.modulemap, -Swift.h) depends on.
""",
        "transitive_index_dependents": """\
A `depset` of transitive generate files(.swiftmodule, swift.modulemap, -Swift.h) depends on.
""",
        "direct_all_index_dependents": """\
A `list` of direct generate files(bis all index dependents str(target), direct_all_index_dependents) depends on.
""",
        "transitive_all_index_dependents": """\
A `depset` of transitive generate files(bis all index dependents str(target), direct_all_index_dependents) depends on.
""",
        "direct_outputs": """\
A `list` of direct outputs((bis artifacts str(target), target[DefaultInfo].files)).
""",
        "transitive_outputs": """\
A `depset` of transitive outputs((bis artifacts str(target), target[DefaultInfo].files)).
""",
    }
)