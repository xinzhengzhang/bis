import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import configuration from "./configuration";
import { exec, execFile, ChildProcess } from "child_process";
import * as logger from "./logger";
import { promisify } from "util";
import { getExtraOutputBaseString, WriteStream, WriteStreamType, onExit } from "./utils";

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
                const r = await this.execResult(buildTarget, folderString, compilationMode, cpu);
                result.push(...r);
            } catch (error) {
                logger.error(error);
            }
        }
        return result;
    }

    private execResult(buildTarget: string, folderString: string, compilationMode: string, cpu: string) : Promise<vscode.Task[]> {
        const _this = this;

        return new Promise((resolve, reject) => {
            let result: vscode.Task[] = [];
            const extractOutputBaseString = getExtraOutputBaseString()??"";
            const process = exec(`bazel query 'kind("(swift|objc|cc)_library", deps("${buildTarget}"))' --output=label`, {
                cwd: folderString
            }, (exception, stdout, stderr) => {
                if (stdout) {
                    const splited = stdout.split(/\r?\n/);
                    splited.forEach((str) => {
                        if (!str) {
                            return;
                        }
                        result.push(
                            _this.createTask(
                                str,
                                compilationMode,
                                cpu,
                                `build ${str}`
                            )
                        );
                    });
                    resolve(result);
                } else {
                    if (exception) {
                        logger.error(exception);
                    }
                    reject(exception);
                }
            });
            process.stdout?.pipe(new WriteStream(WriteStreamType.stdout));
            process.stderr?.pipe(new WriteStream(WriteStreamType.stderr));
        });
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
