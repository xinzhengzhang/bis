/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Command, Service } from './services';

export default class WorkspaceService extends Service {

    @Command({ cmd: "zxz-moe-bis.workspace" })
    async workSpacePath(args: any[]) {
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
        if (defaultWorkspace && args.length > 0 && args[0]) {
            return defaultWorkspace;
        }

        // Select
        let quickPickOptions: vscode.QuickPickOptions = {
            title: "Select Workspace",
            matchOnDescription: true,
        };
        let quickPickItems = bazelWss.map((t): vscode.QuickPickItem => ({
            label: `${t.uri.fsPath === defaultWorkspace ? '$(check)' : '' }\t${path.parse(t.uri.fsPath).base}`,
            description: t.uri.fsPath
        }));
        let target = (await vscode.window.showQuickPick(quickPickItems, quickPickOptions))?.description;
        target && (await vscode.workspace.getConfiguration("bis").update("default_workspace", target));
        return target;
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
                vscode.window.showErrorMessage("Please selecte a workspace");
                return;
            }
            process.chdir(ws);
            return originalMethod.call(this, ...args);
        };
        return descriptor;
    };
}

