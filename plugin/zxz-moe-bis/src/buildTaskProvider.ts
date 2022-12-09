import * as vscode from 'vscode';
import * as picker from './picker';
import * as inputer from './inputer';
import * as cpuProvider from './cpuProvider';
import configuration from "./configuration";
import { _execFile } from "./utils";
import { exec } from 'child_process';
import * as logger from "./logger";
import { promisify } from 'util';

export class BuildTaskProvider implements vscode.TaskProvider {
	static ScriptType = 'bis.build';
	private tasks: vscode.Task[] | undefined;

	public async provideTasks(): Promise<vscode.Task[]> {
        return Promise.all([
            inputer.buildTarget(),
            picker.compilationMode(),
            cpuProvider.cpu()
        ]).then(values => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const result: vscode.Task[] = [];
            let promises: Promise<string[]>[] = [];
            let buildTarget = values[0];
            let compilationMode = values[1] ?? "dbg";
            let cpu = values[2] ?? configuration.simulatorCpuString;

            if (!workspaceFolders || workspaceFolders.length === 0 || !buildTarget) {
                return result;
            }
            for (const workspaceFolder of workspaceFolders) {
                const folderString = workspaceFolder.uri.fsPath;
                const promise = promisify(exec)(`bazel query 'kind("(swift|objc)_library", deps("${values[0]}"))' --output=label`, {cwd: folderString}).then(({stdout, stderr}) => {
                    if (stdout) {
                        const splited = stdout.split(/\r?\n/);
                        return splited.filter(value => {return value.length !== 0;});
                    }
                    return [];
                }).then(undefined, err => {
                    logger.error(err);
                    return [];
                 });
                promises.push(promise);
            }

            return Promise.all(promises).then(values => {
                result.push(this.createTask(buildTarget!, compilationMode, cpu));
                values.forEach(value => {
                    value.forEach(target => {
                        result.push(this.createTask(target, compilationMode, cpu));
                    });
                });
                return result;
            });
        });
	}

    private createTask(target: string, compilationMode: string, cpu: string) {
        const executionCommands = `bazel build ${target} --compilation_mode=${compilationMode} --cpu="${cpu}" ${configuration.buildOptions}`;

        const task = new vscode.Task(
            {
                type: BuildTaskProvider.ScriptType,
                target: target
            },
            vscode.TaskScope.Workspace,
            `build ${target}`,
            BuildTaskProvider.ScriptType,
            new vscode.ShellExecution(executionCommands)
        );
        task.group = vscode.TaskGroup.Build;
        return task;
    }

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        return _task;
	}
}