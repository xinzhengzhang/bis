import * as vscode from 'vscode';
import * as path from 'path';
import * as logger from "./logger";
import { RunLoading } from './loading';
import * as cp from "child_process";
import { EventEmitter } from 'stream';
import { Paths } from './libpath';

class EXEC extends EventEmitter {
    static run(cmd: string) {
        return new EXEC().run(cmd)
    }
    run(cmd: string) {
        return new Promise((resolve, reject) => {
            let childprocess = cp.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    this.emit('error', stderr)
                    reject(stderr)
                } else {
                    this.emit('finished', stdout)
                    resolve(stdout)
                }
            })
            childprocess.stdio[2]?.on('data', this.emit.bind(this))
        })
    }
    on(eventName: 'data' | 'finished' | 'error', listener: (...args: any[]) => void) {
        super.on(eventName, listener)
        return this
    }
}

export function libDeps(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('zxz-moe-bis.lib-deps', () => Deps.resolveLibDeps())
    );
}

function showDialog(opt: vscode.InputBoxOptions): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
        vscode.window.showInputBox(opt).then(res => {
            resolve(res)
        })
    })
}

class Deps {
    static async resolveLibDeps() {
        let lib1 = await showDialog({ title: 'First Lib', value: Paths.first })
        let lib2 = await showDialog({ title: 'Second Lib', value: Paths.second })
        if (!lib1 || !lib2) { return }
        this.computeLibDepsc(lib1, lib2)
    }

    @RunLoading({ title: "Runing", location: vscode.ProgressLocation.Notification })
    static async computeLibDepsc(lib1: string, lib2: string) {
        try {
            const root = resolvedWorkspaceRoot()
            if (!root) { return }
            let output = `${root}/bazel-out/${libName(lib1)}-${libName(lib2)}-${new Date().getTime()}.svg`
            process.chdir(root!)
            let cmd = `bazel query 'allpaths(${lib1}, ${lib2})' --noimplicit_deps --keep_going --output graph | dot -Tsvg > ${output}`
            let exec1 = new EXEC()
            exec1.on('data', data => {
                logger.log('[data]', data)
            })
            exec1.on('finished', stdout => {
                logger.log('[finished]', stdout)
            })
            exec1.on('error', stderr => {
                logger.log('[error]', stderr)
            })
            await exec1.run(cmd)
            let webviewPanel = vscode.window.createWebviewPanel(
                output,
                output,
                vscode.ViewColumn.One,
                {}
            )
            webviewPanel.webview.html = `<img src="${webviewPanel.webview.asWebviewUri(vscode.Uri.file(output))}">`

            vscode.window.showInformationMessage("Completed! \nOpen in browser?", "Yes", "No").then(res => {
                if (res == 'Yes') {
                    EXEC.run(`open ${output}`)
                }
            })
        } catch (e) {
            vscode.window.showErrorMessage(`${e}`)
        }
    }
}

function resolvedWorkspaceRoot() {
    let wsRoot = vscode.workspace.workspaceFolders
    return (wsRoot && wsRoot.length > 0) ? wsRoot[0].uri.fsPath : undefined
}

function libName(libPath: string) {
    let items = libPath.split(":")
    return items.length >= 2 ? items[1] : undefined
}