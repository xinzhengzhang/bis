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
import * as os from "os";
import * as path from "path";

export let _execFile = promisify(execFile);

export let _exec = promisify(exec);

export function isBisWorkspace() {
    const workspaces = vscode.workspace.workspaceFolders;
    if (!workspaces) {
        return false;
    }
    return workspaces.some((workspace) => {
        return fs.existsSync(workspace.uri.fsPath + "/.bis/BUILD");
    });
}

export async function isIdeviceSyslogInstalled(): Promise<boolean> {
    try {
        await _exec("which idevicesyslog");
        return true;
    } catch {
        return false;
    }
}

export function deleteCompileCommandsFile(workspace: vscode.WorkspaceFolder) {
    let path = workspace.uri.fsPath + "/compile_commands.json";
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
}

export async function waitForTaskExecution(execution: vscode.TaskExecution): Promise<void> {
    return new Promise<void>((resolve) => {
        const disposable = vscode.tasks.onDidEndTaskProcess(e => {
            if (e.execution === execution) {
                disposable.dispose();
                resolve();
            }
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
                // The output of vscode cannot add color, so we just log it directly
                logger.log(this.decoder.decode(chunk));
                break;
            case WriteStreamType.stderr:
                // The output of vscode cannot add color, so we just log it with warn level
                logger.warn(this.decoder.decode(chunk));
                break;
        }
        callback(null);
    }
}

export function executeBazelCommands(
    action: "build" | "run" | "query" | "aquery" | "cquery",
    args: ReadonlyArray<string> = [],
    run_args: ReadonlyArray<string> = [],
    workspace?: string | undefined,
    callback?: (
        error: ExecFileException | null,
        stdout: string,
        stderr: string
    ) => void
): ChildProcess {
    const bazelExe = configuration.bazelExecutablePath;
    let finalArgs = ["--preemptible", action, ...args];
    if (action === "run") {
        if (run_args.length > 0) {
            finalArgs.push("--");
            finalArgs.push(...run_args);
        } else {
            logger.warn(
                "No run args provided, this may cause unexpected behavior."
            );
        }
    }
    return execFile(
        bazelExe,
        finalArgs,
        { shell: true, cwd: workspace },
        (error, stdout, stderr) => {
            if (callback) {
                callback(error, stdout, stderr);
            }
        }
    );
}

export function getOrCreateBazelExecutablePath(): string|undefined {
    let bazelPath: string|undefined;
    const workspaces = vscode.workspace.workspaceFolders

    workspaces?.some((workspace) => {
        const workspaceBazelPath = path.resolve(
            workspace.uri.fsPath,
            configuration.bazelExecutablePath
        );
        try {
            if (fs.existsSync(workspaceBazelPath)) {
                bazelPath = fs.realpathSync(workspaceBazelPath);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    });

    if (!bazelPath) {
        return undefined;
    }
    const hash = Buffer.from(bazelPath).toString("base64").replace(/[/+=]/g, "").slice(0, 12);
    const tmpDir = path.join(os.tmpdir(), `bazel-link-${hash}`);
    const linkPath = path.join(tmpDir, "bazel");

    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    let needLink = true;
    if (fs.existsSync(linkPath)) {
        try {
            const stat = fs.lstatSync(linkPath);
            if (stat.isSymbolicLink()) {
                const real = fs.readlinkSync(linkPath);
                if (real === bazelPath) {
                    needLink = false;
                } else {
                    fs.unlinkSync(linkPath);
                }
            } else {
                fs.unlinkSync(linkPath);
            }
        } catch {
            fs.unlinkSync(linkPath);
        }
    }
    if (needLink) {
        fs.symlinkSync(bazelPath, linkPath);
    }

    return tmpDir;
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