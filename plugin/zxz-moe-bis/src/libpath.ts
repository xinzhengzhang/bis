import * as vscode from 'vscode';
import * as path from 'path';

export function libPath(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('zxz-moe-bis.copyLibFullPath', copyLibFullPath)
    );
}

function copyLibFullPath() {
    let editor = vscode.window.activeTextEditor;
    let libName = editor?.document.getText(editor.selection);
    let libPath = editor?.document.uri.fsPath;
    let wsRoot = resolvedWorkspaceRoot(libPath);
    if (!wsRoot) { return; }
    let libDir = path.parse(libPath?.replace(wsRoot!, '')!).dir;
    let libBazelPath = `/${libDir}:${libName}`;
    vscode.env.clipboard.writeText(libBazelPath);
    Paths.add(libBazelPath);
    return libBazelPath;
}

function resolvedWorkspaceRoot(p: string | undefined) {
    if (!p) { return undefined; }
    let wsRoot = vscode.workspace.workspaceFolders?.filter(e => p.indexOf(e.uri.fsPath) >= 0);
    return (wsRoot && wsRoot.length > 0) ? wsRoot[0].uri.fsPath : undefined;
}

export class Paths {
    first: string = "";
    second: string = "";

    static instance: Paths = new Paths();
    private constructor() { }

    static add(lib: string) {
        this.instance.second = this.instance.first;
        this.instance.first = lib;
    }
    static get first() { return this.instance.first; }
    static get second() { return this.instance.second; }
}