import * as vscode from 'vscode';
import * as cp from "child_process";
import { Paths } from './libpath';
import { Workspace } from './workspace';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Command, RunLoading, Service } from './services';
import configuration from './configuration';
const exec = promisify(cp.exec);

async function showChooseLibsInputer(opt: { title: string, placeHolder: string, items: string[] }) {
    let quickPickOptions: vscode.QuickPickOptions = {
        title: opt.title || "Choose lib",
        matchOnDescription: true,
        placeHolder: opt.placeHolder || "Choose lib",
    };

    let choose = await vscode.window.showQuickPick(
        opt.items,
        quickPickOptions
    );
    return choose;
}
export default class LibDepsService extends Service {

    @Command({ cmd: "zxz-moe-bis.lib-deps" })
    @Workspace()
    async resolveLibDeps(ws: string) {
        var items = await vscode.commands.executeCommand<string[]>("zxz-moe-bis.libs");
        let lib1 = await showChooseLibsInputer({ title: 'First Lib', items, placeHolder: "First Lib" });
        if (!lib1) { return; }
        let lib2 = await showChooseLibsInputer({ title: 'Second Lib', items, placeHolder: "Second Lib" });
        if (!lib2) { return; }
        this.computeLibDepsc(ws, lib1, lib2);
    }

    @RunLoading()
    async computeLibDepsc(cwd: string, lib1: string, lib2: string) {
        try {
            let { stdout: bazelOutput } = await exec(`${configuration.bazelExecutablePath} info output_path`, { cwd });
            if (!bazelOutput) { return; }
            bazelOutput = bazelOutput.trim();
            let output = `${bazelOutput}/deps-${new Date().getTime()}.svg`;
            let cmd = `${configuration.bazelExecutablePath} query 'allpaths(${lib1}, ${lib2})' --noimplicit_deps --keep_going --output graph | dot -Tsvg > ${output}`;
            await exec(cmd, { cwd });
            let webviewPanel = vscode.window.createWebviewPanel(
                output,
                output,
                vscode.ViewColumn.One,
                {}
            );
            webviewPanel.webview.html = `<img src="data:image/svg+xml;base64, ${Buffer.from(fs.readFileSync(output)).toString('base64')}">`;
            vscode.window.showInformationMessage("Completed!", "Open in Browser", "Reveal in Finder").then(res => {
                if (res === 'Open in Browser') {
                    exec(`open ${output}`);
                } else if (res === 'Reveal in Finder') {
                    exec(`open ${path.parse(output).dir}`);
                }
            });
        } catch (e) {
            vscode.window.showErrorMessage(`${e}`);
        }
    }
}