import { promisify } from "util";
import * as vscode from "vscode";
import * as fs from "fs";
import {
    execFile,
    ChildProcess,
    exec,
    ExecFileException,
} from "child_process";
import configuration from "./configuration";
import { Transform } from "stream";
import { TextDecoder } from "util";
import * as logger from "./logger";

export let _execFile = promisify(execFile);

export let _exec = promisify(exec);

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

export function deleteCompileCommandsFile(workspace: vscode.WorkspaceFolder) {
    let path = workspace.uri.fsPath + "/compile_commands.json";
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
}

export function isBisInstalled(): Promise<void> {
    return new Promise((resolve, reject) => {
        vscode.commands
            .executeCommand<string | undefined>("zxz-moe-bis.workspace", true)
            .then((workspaceRoot) => {
                promisify(executeBazelCommands)(
                    ["query", "@bis//:setup"],
                    workspaceRoot
                )
                    .then((stdout) => {
                        const splited = stdout.split(/\r?\n/);
                        const containsBis = splited.some((item) => {
                            return item.startsWith("@bis//");
                        });
                        if (containsBis) {
                            resolve(undefined);
                        } else {
                            reject(new Error("no @bis found"));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
    });
}

export function queryLocationOfBUILD(targetPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        vscode.commands
            .executeCommand<string | undefined>("zxz-moe-bis.workspace", true)
            .then((workspaceRoot) => {
                promisify(executeBazelCommands)(
                    ["query", targetPath, "--output=location"],
                    workspaceRoot
                )
                    .then((stdout) => {
                        const r = RegExp(/(.*\/BUILD(?:\.bazel)?\:\d+\:\d+)\:\s+.*rule.*/);
                        if (r.test(stdout)) {
                            resolve(stdout.match(r)![1]);
                        } else {
                            logger.error("Unexpect output: ", stdout);
                            reject(new Error("no BUILD file found"));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
    });
}

export function touchBisBuild() {
    // Touch .bis/BUILD
    const task = new vscode.Task(
        { type: "bis.build" },
        vscode.TaskScope.Workspace,
        "touch_bis_build",
        "bis.build",
        new vscode.ShellExecution("mkdir -p .bis && touch .bis/BUILD")
    );
    vscode.tasks.executeTask(task);
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

export function executeBazelCommands(
    args?: ReadonlyArray<string> | null,
    workspace?: string | undefined,
    callback?: (
        error: ExecFileException | null,
        stdout: string,
        stderr: string
    ) => void
): ChildProcess {
    const bazelExe = configuration.bazelExecutablePath;
    return execFile(
        bazelExe,
        args,
        { shell: true, cwd: workspace },
        (error, stdout, stderr) => {
            if (callback) {
                callback(error, stdout, stderr);
            }
        }
    );
}

export async function macOSVersions() {
    let { stdout: props } = await promisify(exec)("sw_vers");
    logger.log("sw_vers: ", props);
    let productName = "";
    let productVersion = "";
    let buildVersion = "";
    for (const prop of props.trim().split("\n")) {
        let [k, v] = prop.split(":");
        if (k === "ProductName") {
            productName = v.trim();
        } else if (k === "ProductVersion") {
            productVersion = v.trim();
        } else if (k === "BuildVersion") {
            buildVersion = v.trim();
        }
    }
    return {
        name: productName,
        version: productVersion,
        buildVersion: buildVersion,
    };
}

export let isIOS17OrLater = (version: string): boolean => {
    return parseInt(version, 10) >= 17;
};