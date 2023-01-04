import * as vscode from 'vscode';
import { RunLoading } from './loading';
import * as logger from "./logger";
import * as cp from "child_process";
import { EventEmitter } from 'stream';
import { Paths } from './libpath';

type ExecRes = { error: cp.ExecException | null, stdout: string, stderr: string };
class EXEC extends EventEmitter {
    static run(cmd: string) {
        return new EXEC().run(cmd);
    }
    run(cmd: string) {
        return new Promise<ExecRes>((resolve, reject) => {
            let childprocess = cp.exec(cmd, (error, stdout, stderr) => {
                this.emit('finished', { error, stdout, stderr });
                resolve({ error, stdout, stderr });
            });
            childprocess.stdio[2]?.on('data', this.emit.bind(this));
        });
    }
    on(eventName: 'data' | 'finished' | 'error', listener: (...args: any[]) => void) {
        super.on(eventName, listener);
        return this;
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
            resolve(res);
        });
    });
}

class Deps {
    static async resolveLibDeps() {
        let lib1 = await showDialog({ title: 'First Lib', value: Paths.first });
        let lib2 = await showDialog({ title: 'Second Lib', value: Paths.second });
        if (!lib1 || !lib2) { return; }
        this.computeLibDepsc(lib1, lib2);
    }

    @RunLoading({ title: "Runing", location: vscode.ProgressLocation.Notification })
    static async computeLibDepsc(lib1: string, lib2: string) {
        try {
            const root = await vscode.commands.executeCommand<string | undefined>('zxz-moe-bis.workspace');
            logger.log('workspace', root);

            if (!root) {
                vscode.window.showErrorMessage("Please selecte a workspace");
                return;
            }

            process.chdir(root);

            const bazelOutput = await bazelOutputPath();
            if (!root || !bazelOutput) { return; }
            let output = `${bazelOutput}/${libName(lib1)}-${libName(lib2)}-${new Date().getTime()}.svg`;
            let cmd = `bazel query 'allpaths(${lib1}, ${lib2})' --noimplicit_deps --keep_going --output graph | dot -Tsvg > ${output}`;
            await new EXEC().run(cmd);
            let webviewPanel = vscode.window.createWebviewPanel(
                output,
                output,
                vscode.ViewColumn.One,
                {}
            );
            webviewPanel.webview.html = `<img src="${webviewPanel.webview.asWebviewUri(vscode.Uri.file(output))}">`;

            vscode.window.showInformationMessage("Completed! \nOpen in browser?", "Yes", "No").then(res => {
                if (res === 'Yes') {
                    EXEC.run(`open ${output}`);
                }
            });
        } catch (e) {
            vscode.window.showErrorMessage(`${e}`);
        }
    }
}

function libName(libPath: string) {
    let items = libPath.split(":");
    return items.length >= 2 ? items[1] : undefined;
}

async function bazelOutputPath() {
    return new EXEC().run('bazel info output_path').then(({ error, stdout, stderr }) => {
        if (stdout) {
            return stdout.trim();
        }
        return undefined;
    });
}