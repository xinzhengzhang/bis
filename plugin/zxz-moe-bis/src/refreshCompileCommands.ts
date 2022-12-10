import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as path from "path";
import * as logger from "./logger";
import configuration from "./configuration";
import { isBisWorkspace, getCompileCommandsSize } from "./utils";
import { showIfError } from "./error";
import { ChildProcess, execFile } from "child_process";
import { Transform } from "stream";
import { TextDecoder } from "util";

type Context = {
    terminal: CustomBuildTaskTerminal;
};

export function onDidChangeActiveTextEditorMaker() {
    let context: Context = {
        terminal: new CustomBuildTaskTerminal(),
    };

    return function (editor: vscode.TextEditor | undefined) {
        if (editor?.document.uri) {
            vscode.workspace.workspaceFolders?.forEach((value) => {
                if (isBisWorkspace(value)) {
                    let relative = path.relative(
                        value.uri.fsPath,
                        editor?.document.uri.fsPath
                    );
                    // Is there a more elegant way?
                    const supportExt = [".swift", ".m", ".mm"];
                    if (
                        !relative.startsWith("../") &&
                        supportExt.includes(path.extname(relative))
                    ) {
                        refresh(relative, context, value);
                    }
                }
            });
        }
    };
}

async function refresh(
    filePath: string,
    context: Context,
    workspace: vscode.WorkspaceFolder
) {
    const buildTarget = await inputer.buildTarget();
    if (!buildTarget) {
        return;
    }

    const compilationMode = (await picker.compilationMode()) ?? "dbg";
    const cpu = await cpuProvider.cpu();
    context.terminal.doTask(
        buildTarget,
        compilationMode,
        cpu,
        filePath,
        workspace
    );
}

enum WriteStreamType {
    stdout = 1,
    stderr,
}

class WriteStream extends Transform {
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

class CustomBuildTaskTerminal {
    private process?: ChildProcess;
    private currentFilePath = "";
    private parsingFilePath = "";

    async doTask(
        buildTarget: string | undefined,
        compilationMode: string | undefined,
        cpu: string | undefined,
        filePath: string,
        workspace: vscode.WorkspaceFolder
    ) {
        if (
            this.parsingFilePath === filePath ||
            this.currentFilePath === filePath
        ) {
            return;
        }

        this.parsingFilePath = filePath;
        // logger.show(true);
        if (this.process) {
            logger.warn(`killed last process pid = ${this.process.pid}}`);
            this.process.kill();
        }

        logger.log(`Starting setup...\r\n${filePath}\r\n`);

        this.process = this.runBazelProcess(
            workspace.uri.fsPath,
            [
                "run",
                "@bis//:setup",
                "--",
                "--target",
                `${buildTarget}`,
                "--compilation_mode",
                `${compilationMode}`,
                "--cpu",
                `'${cpu}'`,
                "--file_path",
                `${filePath}`,
                "--pre_compile_swift_module",
                `${configuration.prebuildSwiftWhenIndexing}`,
            ],
            (success) => {
                if (!success) {
                    logger.error(`File path=${filePath} failed in bis setup`);
                    this.parsingFilePath = "";
                    return;
                }
                logger.log(`Ending setup...\r\n${filePath}\r\n`);
                logger.log(`Starting refresh...\r\n${filePath}\r\n`);
                const needMerge =
                    (getCompileCommandsSize(workspace) ??
                        Number.MAX_SAFE_INTEGER) <
                    configuration.compileCommandsRollingSize;

                let extraArgs: string[] = [];
                if (needMerge) {
                    extraArgs = ["--", "--merge"];
                }
                this.process = this.runBazelProcess(
                    workspace.uri.fsPath,
                    [
                        "run",
                        "//.bis:refresh_compile_commands",
                        "--check_visibility=false",
                        `--compilation_mode=${compilationMode}`,
                        `--cpu=${cpu}`,
                    ].concat(extraArgs),
                    (success) => {
                        this.parsingFilePath = "";
                        if (!success) {
                            logger.error(
                                `File path=${filePath} failed in refresh_compile_commands`
                            );
                            return;
                        }
                        logger.log(`Ending refresh...\r\n${filePath}\r\n`);

                        this.currentFilePath = filePath;
                    }
                );
            }
        );
    }

    private runBazelProcess(
        cwd: string,
        cmd: string[],
        callback: (success: boolean) => void
    ): ChildProcess {
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
            cmd = [
                "--output_base",
                backgroudOutputBase,
            ].concat(cmd);
        }

        let process = execFile("bazel", cmd, { cwd: cwd }, (exception) => {
            callback(exception ? false : true);
            showIfError(Number(exception?.code));
        });
        process.stdout?.pipe(new WriteStream(WriteStreamType.stdout));
        process.stderr?.pipe(new WriteStream(WriteStreamType.stderr));
        return process;
    }
}
