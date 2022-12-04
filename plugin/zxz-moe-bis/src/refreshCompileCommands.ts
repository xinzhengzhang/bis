import { _execFile } from "./utils";
import * as vscode from 'vscode';
import * as picker from './picker';
import * as inputer from './inputer';
import * as cpuProvider from './cpuProvider';
import * as path from 'path';
import configuration from "./configuration";

export function onDidChangeActiveTextEditor(editor: vscode.TextEditor|undefined) {
    if (editor?.document.uri) {
        vscode.workspace.workspaceFolders?.forEach(value => {
            let relative = path.relative(value.uri.fsPath, editor?.document.uri.fsPath);
            // Is there a more elegant way?
            if (!relative.startsWith("../")) {
                refresh(relative);
            }
        });
    }
}

export async function refresh(filePath: string)
{
    const buildType: string = "bis.build";
    return Promise.all([
        inputer.buildTarget(),
        picker.compilationMode(),
        cpuProvider.cpu()
    ]).then(values => {
        let executionCommands = `bazel run @bis//:setup -- --target ${values[0]} --compilation_mode ${values[1]} --cpu "${values[2]}" --file_path ${filePath} --pre_compile_swift_module ${configuration.prebuildSwiftWhenIndexing}`;
        executionCommands += `;bazel run //.bis:refresh_compile_commands --compilation_mode=${values[1]} --cpu="${values[2]}"`;
        const task = new vscode.Task(
            {type: buildType},
            vscode.TaskScope.Workspace,
            `refresh_compile_commands ${executionCommands}`,
            buildType,
            new vscode.ShellExecution(executionCommands)	
        );
        vscode.tasks.executeTask(task);
    });
}