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

export function getExtraOutputBaseString(): string|undefined {
    const backgroudOutputBase = configuration.bazelBackgroundOutputBase;
    let needBackgroundOutputBase: boolean = false;

    if (backgroudOutputBase.length) {
        needBackgroundOutputBase = vscode.tasks.taskExecutions.filter((value) => {
            return (
                value.task.name === "build" &&
                value.task.source === "bis.build"
            );
        }).length > 0;
    }

    if (needBackgroundOutputBase) {
        return `--output_base ${backgroudOutputBase}`;
    } else {
        return undefined;
    }
}

export function onExit(childProcess: ChildProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      childProcess.once('exit', (code: number, signal: string) => {
        if (code === 0) {
          resolve(undefined);
        } else {
          reject(new Error('Exit with error code: '+code));
        }
      });
      childProcess.once('error', (err: Error) => {
        reject(err);
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