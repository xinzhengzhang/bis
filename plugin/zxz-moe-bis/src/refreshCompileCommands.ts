import { isBisWorkspace, _execFile } from "./utils";
import * as vscode from 'vscode';
import * as picker from './picker';
import * as inputer from './inputer';
import * as cpuProvider from './cpuProvider';
import * as path from 'path';
import configuration from "./configuration";
import { ChildProcess, ChildProcessWithoutNullStreams, exec, execFile, spawn } from "child_process";
import { Transform } from "stream";
import * as logger from "./logger";
import { TextDecoder } from "util";

type Context = {
    terminal: CustomBuildTaskTerminal
};

export function onDidChangeActiveTextEditorMaker() {

    let context:Context = {
        terminal: new CustomBuildTaskTerminal()
    };

    return function(editor: vscode.TextEditor|undefined) {
        if (editor?.document.uri) {
            vscode.workspace.workspaceFolders?.forEach(value => {
                if (isBisWorkspace(value)) {
                    let relative = path.relative(value.uri.fsPath, editor?.document.uri.fsPath);
                    // Is there a more elegant way?
                    const supportExt = ['.swift', '.m', '.mm'];
                    if (!relative.startsWith("../") && supportExt.includes(path.extname(relative))) {
                        refresh(relative, context, value.uri.fsPath);
                    }
                }
            });
        }
    };
}

async function refresh(filePath: string, context: Context, cwd: string)
{
    return Promise.all([
        inputer.buildTarget(),
        picker.compilationMode(),
        cpuProvider.cpu()
    ]).then(values => {
        context.terminal.doTask(values[0], values[1], values[2], filePath, cwd);
    });
}

enum WriteStreamType {
    stdout = 1,
    stderr,
}

class WriteStream extends Transform {

    private decoder = new TextDecoder();
    constructor(private type: WriteStreamType){
        super();
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: any) {
        switch(this.type) {
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

    async doTask(buildTarget: string|undefined, compilationMode: string|undefined, cpu: string|undefined, filePath: string, cwd: string) {
        if (this.parsingFilePath === filePath) {
            return;
        }
        if (this.currentFilePath === filePath) {
            return;
        }

        this.parsingFilePath = filePath;

        logger.show();
        if (this.process) {
            logger.warn(`killed last process pid = ${this.process.pid}}`);
            this.process.kill();
        }

        logger.log(`Starting setup...\r\n${filePath}\r\n`);

        this.process = this.runBazelProcess(
            cwd,
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
                `${configuration.prebuildSwiftWhenIndexing}`
            ],
            (success) => {
                if (!success) {
                    logger.error(`File path=${filePath} failed in bis setup`);
                    return;
                }
                logger.log(`Ending setup...\r\n${filePath}\r\n`);
                logger.log(`Starting refresh...\r\n${filePath}\r\n`);

                this.process = this.runBazelProcess(
                    cwd,
                    [
                        "run", 
                        "//.bis:refresh_compile_commands", 
                        "--check_visibility=false", 
                        `--compilation_mode=${compilationMode}`, 
                        `--cpu=${cpu}`, 
                    ],
                    (success) => {
                        if (!success) {
                            logger.error(`File path=${filePath} failed in refresh_compile_commands`);
                            return;
                        }
                        logger.log(`Ending refresh...\r\n${filePath}\r\n`);
                        this.currentFilePath = filePath;
                    } 
                );
            }
        );
    }

    private runBazelProcess(cwd: string, cmd: string[], callback: ((success: boolean) => void)): ChildProcess {
        const needAnotherOutputBase: boolean = vscode.tasks.taskExecutions.filter(value => {
            return (value.task.name === "build" && value.task.source === "bis.build");
        }).length > 0;

        if (needAnotherOutputBase) {
            cmd = ["--output_base", configuration.bazelBackgroundOutputBase].concat(cmd);
        }

        let process = execFile(
            "bazel",
            cmd,
            {cwd: cwd},
            (exception) => {
                callback(exception?false:true);
            }
        );
        process.stdout?.pipe(new WriteStream(WriteStreamType.stdout));
        process.stderr?.pipe(new WriteStream(WriteStreamType.stderr));
        return process;
    }
}