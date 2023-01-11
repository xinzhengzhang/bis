import { promisify } from "util";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { execFile, ChildProcess } from "child_process";
import configuration from "./configuration";
import { Transform } from "stream";
import { TextDecoder } from "util";
import * as logger from "./logger";

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

export function isBisInstalled(): Promise<void> {
    return new Promise((resolve, reject) => {
        vscode.commands.executeCommand<string | undefined>('zxz-moe-bis.workspace', true).then((workspaceRoot) => {
            promisify(execFile)("bazel", ["query", '"filter(@bis//, loadfiles(//...))"'], {
                shell: true,
                cwd: workspaceRoot,
            }).then((value) => {
                const splited = value.stdout.split(/\r?\n/);
                const containsBis =  splited.some((item) => {
                    return item.startsWith("@bis//");
                });
                if (containsBis) {
                    resolve(undefined);
                } else {
                    reject(new Error('no @bis found'));
                }
            }).catch(error => {
                reject(error);
            });
        });
    });
}

export enum WriteStreamType {
    stdout = 1,
    stderr,
}

export class WriteStream extends Transform {
    private decoder = new TextDecoder();
    constructor(private type: WriteStreamType) {
        super();
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: any) {
        switch (this.type) {
            case WriteStreamType.stdout:
                logger.log(this.decoder.decode(chunk));
                break;
            case WriteStreamType.stderr:
                logger.warn(this.decoder.decode(chunk));
                break;
        }
        callback(null);
    }
}