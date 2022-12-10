import { promisify } from "util";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";

export function isBisWorkspace(workspace: vscode.WorkspaceFolder) {
    return fs.existsSync(workspace.uri.fsPath + "/.bis/BUILD");
}

export function launchConfigurationExists() {
    let exists = false;

    vscode.workspace.workspaceFolders?.forEach((value) => {
        if (fs.existsSync(value.uri.fsPath + "/.vscode/launch.json")) {
            exists = true;
        }
    });

    return exists;
}

export function getCompileCommandsSize(workspace: vscode.WorkspaceFolder) {
    let path = workspace.uri.fsPath + "/compile_commands.json";
    if (!fs.existsSync(path)) {
        return undefined;
    }
    return fs.statSync(path).size;
}
