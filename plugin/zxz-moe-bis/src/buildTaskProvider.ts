import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import configuration from "./configuration";
import { exec, execFile, ChildProcess } from "child_process";
import * as logger from "./logger";
import { promisify } from "util";
import { deleteCompileCommandsFile, waitForTaskExecution, WriteStream, WriteStreamType } from "./utils";
import { compilationModeVariable, cpuVariable, targetVariable } from "./variables";
import { tmpdir } from "os";
import path = require("path");
import { readFileSync, unlinkSync, writeFileSync } from "fs";

export class BuildTaskProvider implements vscode.TaskProvider {
    static scriptType = "bis.build";

    public async provideTasks(): Promise<vscode.Task[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.length) {
            return [];
        }
        const buildTarget = targetVariable.get();
        const compilationMode = compilationModeVariable.get();
        const cpu = cpuVariable.get();

        if (!buildTarget || !compilationMode || !cpu) {
            return [];
        }

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

    private async execResult(
        buildTarget: string,
        folderString: string,
        compilationMode: string,
        cpu: string | undefined
    ): Promise<vscode.Task[]> {
        const _this = this;

        const allArtifactsLabelFiles = path.join(tmpdir(), `bis_artifacts_labels_${Date.now()}.txt`);
            writeFileSync(allArtifactsLabelFiles, "");
        const cpuOpts = cpu ? `--ios_multi_cpus=${cpu}` : "";
        const command = `outpath=\`${configuration.bazelExecutablePath} ${configuration.startupOptions} --preemptible cquery ${buildTarget} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions} --output=starlark --starlark:expr="'{}/{}_bis_artifacts_labels.txt'.format(target.label.package, target.label.name)"\` && ${configuration.bazelExecutablePath} ${configuration.startupOptions} --preemptible build ${buildTarget} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions} --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis artifacts labels" && cat bazel-bin/$outpath > ${allArtifactsLabelFiles}`;

        const task = new vscode.Task(
            { type: "bis.query.artifacts" },
            vscode.TaskScope.Workspace,
            "query bis artifacts labels",
            "bis.build",
            new vscode.ShellExecution(command)
        );
        task.presentationOptions.focus = false;

        logger.log(`Executing command: ${command}`);

        await waitForTaskExecution(await vscode.tasks.executeTask(task));

        return new Promise((resolve, reject) => {
            let result: vscode.Task[] = [];

            const stdout = readFileSync(allArtifactsLabelFiles).toString(); // Ensure the file is created before exec
            unlinkSync(allArtifactsLabelFiles);
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
                splited
                    .filter(str => str.startsWith('bis artifacts '))
                    .map((str) => str.replace(/^bis artifacts /, '')).forEach((str) => {
                        if (!str) {
                            return;
                        }
                        const labelIdentifier = `${str}`;
                        result.push(
                            _this.createSyncCommandTask(buildTarget, labelIdentifier)
                        );
                    });
                resolve(result);
            } else {
                reject(new Error(`No output from command: ${command}`));
            }
        });
    }

    private createTask(
        command: string = "build",
        target: string,
        labelIdentifier: string | undefined,
        compilationMode: string,
        cpu: string | undefined,
    ) {
        const cpuOpts = cpu ? `--ios_multi_cpus=${cpu}` : "";
        let executionCommands = `${configuration.bazelExecutablePath} ${configuration.startupOptions} ${command} ${target} --compilation_mode=${compilationMode} ${cpuOpts} ${configuration.buildOptions}`;
        if (labelIdentifier) {
            executionCommands += ` --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="bis ${labelIdentifier}"`;
        }
        const task = new vscode.Task(
            {
                type: BuildTaskProvider.scriptType,
                target: target + (labelIdentifier ?? command),
            },
            vscode.TaskScope.Workspace,
            labelIdentifier ?? command,
            BuildTaskProvider.scriptType,
            new vscode.ShellExecution(executionCommands)
        );
        task.group = vscode.TaskGroup.Build;
        return task;
    }

    private createSyncCommandTask(
        target: string,
        labelIdentifier: string,
    ) {
        const task = new vscode.Task(
            {
                type: BuildTaskProvider.scriptType,
                target: target + " sync " + labelIdentifier,
            },
            vscode.TaskScope.Workspace,
            "sync " + labelIdentifier,
            BuildTaskProvider.scriptType,
            new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
                const writeEmitter = new vscode.EventEmitter<string>();
                const closeEmitter = new vscode.EventEmitter<number|void>();
                return {
                    onDidWrite: writeEmitter.event,
                    onDidClose: closeEmitter.event,
                    open: () => {
                        vscode.commands.executeCommand("zxz-moe-bis.syncCompileCommandsAndRestartLsp", labelIdentifier);
                        closeEmitter.fire(0);
                    },
                    close: () => { },
                    handleInput: () => { }
                };
            })
        );
        task.group = vscode.TaskGroup.Build;
        return task;
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        return _task;
    }
}
