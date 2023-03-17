def _template_generator(ctx):

    ctx.actions.expand_template(
        template = ctx.file._runner_template,
        output = ctx.outputs.output,
        is_executable = True,
        substitutions = {},
    )

    return [
        DefaultInfo(
            executable = ctx.outputs.output,
        ),
    ]

template_generator = rule(
    implementation = _template_generator,
    attrs = {
        "_runner_template": attr.label(
            allow_single_file = True,
            default = Label("//:bis_setup.template.py"),
        ),
        "output": attr.output(mandatory=True)
    },
    executable = True,
)