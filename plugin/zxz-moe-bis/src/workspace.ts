import * as vscode from 'vscode';
import * as logger from "./logger";
import * as fs from 'fs';
import * as path from 'path';

export function workspace(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('zxz-moe-bis.workspace', workSpacePath)
    );
}


async function workSpacePath() {
    let bazelWss = vscode.workspace.workspaceFolders?.filter(wf => fs.existsSync(path.join(wf.uri.fsPath, 'WORKSPACE')));
    if (!bazelWss || bazelWss.length === 0) {
        return undefined;
    }

    // Signle
    if (bazelWss?.length === 1) {
        return bazelWss[0].uri.fsPath;
    }

    // Default
    let defaultWorkspace = vscode.workspace.getConfiguration("bis").get<string>("default_workspace");
    if (defaultWorkspace) {
        return defaultWorkspace;
    }

    // Select
    let quickPickOptions: vscode.QuickPickOptions = {
        title: "Select Workspace",
        matchOnDescription: true,
    };
    let quickPickItems = bazelWss.map((t): vscode.QuickPickItem => ({
        label: path.parse(t.uri.fsPath).base,
        description: t.uri.fsPath
    }));
    let target = (await vscode.window.showQuickPick(quickPickItems, quickPickOptions))?.description;
    target && (await vscode.workspace.getConfiguration("bis").update("default_workspace", target));
    return target;
}