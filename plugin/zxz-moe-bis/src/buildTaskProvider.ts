import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import configuration from "./configuration";
import { exec, execFile, ChildProcess } from "child_process";
import * as logger from "./logger";
import { promisify } from "util";
import { WriteStream, WriteStreamType } from "./utils";

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
        const cpu = cpuProvider.cpu();
        return [
            this.createTask(
                "build",
                buildTarget!,
                undefined,
                compilationMode,
                cpu
            ),
            this.createTask(
                "run",
                buildTarget!,
                undefined,
                compilationMode,
                cpu
            ),
            this.createTask(
                "build",
                buildTarget,
                "xctest bundle outputs",
                compilationMode,
                cpu
            )
        ];
    }

    public async provideAllTasks(): Promise<vscode.Task[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.length) {
            return [];
        }
        const buildTarget = await inputer.buildTarget();
        if (!buildTarget) {
            return [];
        }

        const compilationMode = (await picker.compilationMode()) ?? "dbg";
        const cpu = cpuProvider.cpu();
        const result: vscode.Task[] = await this.provideTasks();

        for (const workspaceFolder of workspaceFolders) {
            const folderString = workspaceFolder.uri.fsPath;
            try {
                const r = await this.execResult(
                    buildTarget,
                    folderString,
                    compilationMode,
                    cpu
                );
                result.push(...r);
            } catch (error) {
                logger.error(error);
            }
        }
        return result;
    }

    private execResult(
        buildTarget: string,
        folderString: string,
        compilationMode: string,
        cpu: string | undefined
    ): Promise<vscode.Task[]> {
        const _this = this;

        return new Promise((resolve, reject) => {
            let result: vscode.Task[] = [];
            const cpuOpts = cpu ? `--cpu=${cpu}` : "";
            const command = `outpath=\`bazel ${configuration.startupOptions} cquery ${buildTarget} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions} --output=starlark --starlark:expr="'{}/{}_bis_artifacts_labels.txt'.format(target.label.package, target.label.name)"\` && ${configuration.bazelExecutablePath} ${configuration.startupOptions} build ${buildTarget} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions} --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis artifacts labels" && cat bazel-bin/$outpath`;
            // const command = `${configuration.bazelExecutablePath} ${configuration.startupOptions} build ${buildTarget} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions} --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis artifacts labels" && bazel ${configuration.startupOptions} cquery ${buildTarget} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions} --output=starlark --starlark:expr="'{}/{}_bis_artifacts_labels.txt'.format(target.label.package, target.label.name)"  | xargs -I{} cat bazel-bin/{}`;
            const process = exec(
                command,
                {
                    cwd: folderString,
                },
                (exception, stdout, stderr) => {
                    if (stdout) {
                        const splited = stdout.split(/\r?\n/);
                        splited.forEach((str) => {
                            if (!str) {
                                return;
                            }
                            const labelIdentifier = `${str.replace(
                                /^bis /,
                                ""
                            )}`;
                            result.push(
                                _this.createTask(
                                    "build",
                                    buildTarget,
                                    labelIdentifier,
                                    compilationMode,
                                    cpu
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
                }
            );
            process.stdout?.pipe(new WriteStream(WriteStreamType.stdout));
            process.stderr?.pipe(new WriteStream(WriteStreamType.stderr));
        });
    }

    private createTask(
        command: string = "build",
        target: string,
        labelIdentifier: string|undefined,
        compilationMode: string,
        cpu: string | undefined,
    ) {
        const cpuOpts = cpu ? `--cpu=${cpu}` : "";
        let executionCommands = `${configuration.bazelExecutablePath} ${configuration.startupOptions} ${command} ${target} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions}`;
        if (labelIdentifier) {
            executionCommands += ` --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis ${labelIdentifier}"`;
        }
        const task = new vscode.Task(
            {
                type: BuildTaskProvider.scriptType,
                target: target + (labelIdentifier??command),
            },
            vscode.TaskScope.Workspace,
            labelIdentifier??command,
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
