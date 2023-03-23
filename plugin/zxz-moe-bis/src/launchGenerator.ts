import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import configuration from "./configuration";

export async function generate() {
    const buildType: string = "bis.build";

    const buildTarget = await inputer.buildTarget();
    const compilationMode = (await picker.compilationMode()) ?? "dbg";
    const cpu = await cpuProvider.cpu();

    let executionCommands = `${configuration.bazelExecutablePath} run @bis//:setup -- --target ${buildTarget} --optionals \"--compilation_mode=${compilationMode} --cpu="${cpu}" ${configuration.buildOptions}\" --ignore_parsing_targets True`;
    executionCommands += `;${configuration.bazelExecutablePath} ${configuration.startupOptions} run //.bis:refresh_launch_json --check_visibility=false --compilation_mode=${compilationMode} --cpu="${cpu}" ${configuration.buildOptions}`;
    const task = new vscode.Task(
        { type: buildType },
        vscode.TaskScope.Workspace,
        "generate_launch_json",
        buildType,
        new vscode.ShellExecution(executionCommands)
    );
    vscode.tasks.executeTask(task);
}
