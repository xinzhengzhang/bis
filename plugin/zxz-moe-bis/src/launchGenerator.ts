import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as utils from "./utils";
import * as logger from "./logger";
import configuration from "./configuration";

export async function generate() {
    const buildType: string = "bis.build";

    const buildTarget = await inputer.buildTarget();
    const compilationMode = (await picker.compilationMode());
    const cpu = await cpuProvider.cpu();

    if (!buildTarget || !compilationMode || !cpu) {
        logger.log("Build target is not specified.");
        return;
    }

    let executionCommands = `${configuration.bazelExecutablePath} ${configuration.startupOptions} run @bis//:setup --check_visibility=false --compilation_mode=${compilationMode} --ios_multi_cpus=${cpu} ${configuration.buildOptions} -- --target ${buildTarget} --optionals \"--compilation_mode=${compilationMode} --ios_multi_cpus=${cpu} ${configuration.buildOptions}\" --ignore_parsing_targets True`;
    executionCommands += `;${configuration.bazelExecutablePath} ${configuration.startupOptions} run //.bis:refresh_launch_json --check_visibility=false --compilation_mode=${compilationMode} --ios_multi_cpus=${cpu} ${configuration.buildOptions}`;

    const bazelPath = utils.getOrCreateBazelExecutablePath();
    logger.log(`Bazel temp executable path: ${bazelPath}`);

    const pathOptions: vscode.ShellExecutionOptions | undefined =
        bazelPath !== undefined
            ? {
                env: {
                    ...process.env,
                    PATH: `${bazelPath}:${process.env.PATH}`
                }
            }
            : undefined;
    const task = new vscode.Task(
        { type: buildType },
        vscode.TaskScope.Workspace,
        "generate_launch_json",
        buildType,
        new vscode.ShellExecution(executionCommands, pathOptions)
    );
    vscode.tasks.executeTask(task);
}
