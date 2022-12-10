import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import configuration from "./configuration";
import { exec } from "child_process";
import * as logger from "./logger";
import { promisify } from "util";

export class BuildTaskProvider implements vscode.TaskProvider {
    static scriptType = "bis.build";

    public async provideTasks(): Promise<vscode.Task[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.length) {
            return [];
        }
        const buildTarget = await inputer.buildTarget();
        if (!buildTarget) {
            return [];
        }

        const compilationMode = (await picker.compilationMode()) ?? "dbg";
        const cpu = await cpuProvider.cpu();
        const result: vscode.Task[] = [
            this.createTask(buildTarget!, compilationMode, cpu, "build"),
        ];

        for (const workspaceFolder of workspaceFolders) {
            const folderString = workspaceFolder.uri.fsPath;
            try {
                const { stdout } = await promisify(exec)(
                    `bazel query 'kind("(swift|objc)_library", deps("${buildTarget}"))' --output=label`,
                    { cwd: folderString }
                );
                if (stdout) {
                    const splited = stdout.split(/\r?\n/);
                    splited.forEach((str) => {
                        if (!str) {
                            return;
                        }
                        result.push(
                            this.createTask(
                                str,
                                compilationMode,
                                cpu,
                                `build ${str}`
                            )
                        );
                    });
                }
            } catch (error) {
                logger.error(error);
            }
        }
        return result;
    }

    private createTask(
        target: string,
        compilationMode: string,
        cpu: string,
        source: string
    ) {
        const executionCommands = `bazel build ${target} --compilation_mode=${compilationMode} --cpu="${cpu}" ${configuration.buildOptions}`;

        const task = new vscode.Task(
            {
                type: BuildTaskProvider.scriptType,
                target: target,
            },
            vscode.TaskScope.Workspace,
            source,
            BuildTaskProvider.scriptType,
            new vscode.ShellExecution(executionCommands)
        );
        task.group = vscode.TaskGroup.Build;
        return task;
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        return _task;
    }
}
