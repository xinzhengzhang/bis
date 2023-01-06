import * as vscode from 'vscode';
import * as path from 'path';
import { Command, Service } from './services';
import { Workspace } from './workspace';
import { promisify } from 'util';
import * as cp from 'child_process';

const exec = promisify(cp.exec);
export default class LibPathService extends Service {

    @Command({ cmd: "zxz-moe-bis.copyTargetPath", useContext: true })
    @Workspace()
    async copyLibFullPath() {
        try {
            let editor = vscode.window.activeTextEditor;
            let libName = editor?.document.getText(editor.selection);
            let libPath = editor?.document.uri.fsPath;
            let { stdout: wsRoot } = await exec('pwd');
            if (!wsRoot) { return; }
            let libDir = path.parse(libPath?.replace(wsRoot.trim(), '')!).dir;
            let libBazelPath = `/${libDir}:${libName}`;
            vscode.env.clipboard.writeText(libBazelPath);
            Paths.add(libBazelPath);
            return libBazelPath;
        } catch (e) {

        }
    }
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