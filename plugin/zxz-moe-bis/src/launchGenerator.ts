import * as vscode from 'vscode';
import * as picker from './picker';
import * as inputer from './inputer';
import * as cpuProvider from './cpuProvider';
import configuration from './configuration';

export async function generate()
{
    const buildType: string = "bis.build";
    return Promise.all([
        inputer.buildTarget(),
        picker.compilationMode(),
        cpuProvider.cpu()
    ]).then(values => {
        let executionCommands = `bazel run @bis//:setup -- --target ${values[0]} --compilation_mode ${values[1]} --cpu "${values[2]}" --ignore_parsing_targets True --pre_launch_task_name "${configuration.preLaunchTaskName}"`;
        executionCommands += `;bazel run //.bis:refresh_launch_json --check_visibility=false --compilation_mode=${values[1]} --cpu="${values[2]}"`;
        const task = new vscode.Task(
            {type: buildType},
            vscode.TaskScope.Workspace,
            "generate_launch_json",
            buildType,
            new vscode.ShellExecution(executionCommands)
        );
        vscode.tasks.executeTask(task);
    });
}