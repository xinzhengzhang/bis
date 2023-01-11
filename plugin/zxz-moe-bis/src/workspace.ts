/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Command, Service } from './services';

const exec = promisify(cp.exec);

export default class WorkspaceService extends Service {

    @Command({ cmd: "zxz-moe-bis.workspace" })
    async workSpacePath(args: any[]) {
        let bazelWss = vscode.workspace.workspaceFolders?.filter(wf => fs.existsSync(path.join(wf.uri.fsPath, 'WORKSPACE')));
        if (!bazelWss || bazelWss.length === 0) {
            return undefined;
        }

        // Single
        if (bazelWss?.length === 1) {
            return bazelWss[0].uri.fsPath;
        }

        // User Defaults
        // from cmd palette: always show pick
        // from cmd call: return with the default exists
        let defaultWorkspace = vscode.workspace.getConfiguration("bis").get<string>("default_workspace");
        if (defaultWorkspace && args.length > 0 && args[0]) {
            return defaultWorkspace;
        }

        // Select
        let quickPickOptions: vscode.QuickPickOptions = {
            title: "Select Workspace",
            matchOnDescription: true,
        };
        let quickPickItems = bazelWss.map((t): vscode.QuickPickItem => ({
            label: `${t.uri.fsPath === defaultWorkspace ? '$(check)' : ''}\t${path.parse(t.uri.fsPath).base}`,
            description: t.uri.fsPath
        }));
        let target = (await vscode.window.showQuickPick(quickPickItems, quickPickOptions))?.description;

        // Store
        target && (await vscode.workspace.getConfiguration("bis").update("default_workspace", target));
        return target;
    }

    @Command({ cmd: "zxz-moe-bis.libs" })
    @Workspace()
    async libs(cwd: string) {
        let rule = vscode.workspace.getConfiguration("bis").get<string>("query_rule");
        rule = rule || "(swift|objc|cc)_library";
        let cmd = `bazel query 'kind("${rule}", //...)' --output label`;
        let { stdout } = await exec(cmd, { cwd });
        return stdout.split('\n').map(e => e.trim());
    }
}

/**
 * use @Workspace() to a function to make sure `cd ${workspace}`
 * @returns 
 */
export function Workspace(): any {
    return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const ws = await vscode.commands.executeCommand<string | undefined>('zxz-moe-bis.workspace', true);
            if (!ws) {
                vscode.window.showErrorMessage("Please select a workspace");
                return;
            }
            return originalMethod.call(this, ws, ...args);
        };
        return descriptor;
    };
}

