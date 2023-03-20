import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as path from "path";
import * as logger from "./logger";
import configuration from "./configuration";
import { isBisWorkspace, getCompileCommandsSize, WriteStream, WriteStreamType, deleteCompileCommandsSize, executeBazelCommands } from "./utils";
import { showIfError } from "./error";
import { ChildProcess, execFile } from "child_process";
import * as readline from "readline";
import * as fs from "fs";

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
                    logger.log(`TextEditor changed...\r\n${relative}\r\n`);
                    // Is there a more elegant way?
                    // cpp extension:... https://github.com/llvm/llvm-project/blob/b9f3b7f89a4cb4cf541b7116d9389c73690f78fa/clang/lib/Driver/Types.cpp#L293
                    const supportExt = [".h", ".swift", ".m", ".mm", ".c", ".cc", ".cpp", ".cxx", ".c++", ".C", ".CC", ".CPP", ".CXX", ".C++"];
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
        logger.log("Refresh Compile Commands: no target specified");
        return;
    }

    if (configuration.checkDuplicateCompileCommands) {
        if (await containesFiles(workspace, filePath)) {
            logger.log(`Refresh Compile Commands: ${filePath} in cache`);
            return;
        } else {
            logger.log(`Refresh Compile Commands: ${filePath} not in cache`);
        }
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

async function containesFiles(workspace: vscode.WorkspaceFolder,filePath: string) {
    let containts = false;
    if (getCompileCommandsSize(workspace)) {
        let path = workspace.uri.fsPath + "/compile_commands.json";
        const rl = readline.createInterface({
            input: fs.createReadStream(path),
            crlfDelay: Infinity
        });
        rl.on('line', (line) => {
            if (line.includes(`"file": "${filePath}"`)) {
                containts = true;
                rl.close();
            }
        });
    
        await new Promise((res) => rl.once('close', res));
    }
    return containts;
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
                `${filePath}`
            ],
            (success) => {
                if (!success) {
                    logger.error(`File path=${filePath} failed in bis setup`);
                    this.parsingFilePath = "";
                    return;
                }
                logger.log(`Ending setup...\r\n${filePath}\r\n`);
                logger.log(`Starting refresh...\r\n${filePath}\r\n`);
                const shouldCleanCompileCommands =
                    (getCompileCommandsSize(workspace) ??
                        Number.MAX_SAFE_INTEGER) <
                    configuration.compileCommandsRollingSize;
                if (shouldCleanCompileCommands) {
                    deleteCompileCommandsSize(workspace);
                }
                this.process = this.runBazelProcess(
                    workspace.uri.fsPath,
                    [
                        "run",
                        "//.bis:refresh_compile_commands",
                        "--check_visibility=false",
                        `--compilation_mode=${compilationMode}`,
                        `--cpu=${cpu}`,
                    ],
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
        
        let process = executeBazelCommands(cmd, cwd, (exception) => {
            callback(exception ? false : true);
            showIfError(Number(exception?.code));
        });
        process.stdout?.pipe(new WriteStream(WriteStreamType.stdout));
        process.stderr?.pipe(new WriteStream(WriteStreamType.stderr));
        return process;
    }
}
