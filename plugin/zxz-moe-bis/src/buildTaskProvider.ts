import * as vscode from 'vscode';
import * as picker from './picker';
import * as inputer from './inputer';
import * as cpuProvider from './cpuProvider';

export class BuildTaskProvider implements vscode.TaskProvider {
	static ScriptType = 'bis.build';
	private tasks: vscode.Task[] | undefined;

	public async provideTasks(): Promise<vscode.Task[]> {
        return Promise.all([
            inputer.buildTarget(),
            picker.compilationMode(),
            cpuProvider.cpu()
        ]).then(values => {
            let executionCommands = `bazel build ${values[0]} --compilation_mode=${values[1]} --cpu="${values[2]}"`;
            return [new vscode.Task(
                {type: BuildTaskProvider.ScriptType},
                vscode.TaskScope.Workspace,
                "build",
                BuildTaskProvider.ScriptType,
                new vscode.ShellExecution(executionCommands)	
            )];
        });
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        return _task;
	}
}