import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as logger from "./logger";
import configuration from "./configuration";
import * as utils from "./utils";

export async function sync(subtarget?: string) {
    const buildType: string = "bis.build";

    const buildTarget = await inputer.buildTarget();
    const compilationMode = (await picker.compilationMode()) ?? "dbg";
    const cpu = await cpuProvider.cpu();

    let executionCommands = `${configuration.bazelExecutablePath} run @bis//:setup -- --target ${buildTarget} --optionals \"--compilation_mode=${compilationMode} --cpu="${cpu}" ${configuration.buildOptions} --profile .bis/bis_bazel_profile\"`;
    if (subtarget) {
        executionCommands += ` --subtarget ${subtarget}`;
    }

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
    vscode.tasks.executeTask(task).then(() => {
        logger.log(`Sync task executed: ${executionCommands}`);
        vscode.commands.executeCommand(
            "swift.restartLSPServer"
        ).then(() => {
            logger.log("LSP server restarted after sync task.");
        });
    });
}
