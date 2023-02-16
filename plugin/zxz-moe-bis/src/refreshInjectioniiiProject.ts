import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as logger from "./logger";
import * as zlib from "node:zlib";
import * as fs from "fs";
import * as os from "os";

import { isBisWorkspace } from "./utils";
import { execFile, execFileSync, execSync } from "node:child_process";
import { promisify } from "util";

export async function refreshInjectionIIIProject() {

    const buildTarget = await inputer.buildTarget();
    const compilationMode = (await picker.compilationMode()) ?? "dbg";
    const cpu = await cpuProvider.cpu();
    const targetSdk: string = await vscode.commands.executeCommand("ios-debug.targetSdk");

    vscode.workspace.workspaceFolders?.forEach((value) => {
        if (isBisWorkspace(value)) {
            const buildType: string = "bis.build";
            const cwd = value.uri.fsPath;

            let dir = cwd + "/bis-dummy.xcodeproj";
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            dir = os.homedir() + "/Library/Developer/Xcode/DerivedData/bis-dummy-log/Logs/Build";
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true});
            }

            promisify(execFile)("xcrun", ["--sdk", targetSdk ?? "iphonesimulator", "--show-sdk-path"], {
                shell: true,
                cwd: cwd
            }).then((sdkPath) => {

                promisify(execFile)("which", ["bazel"], {
                    shell: true,
                    cwd: cwd
                }).then((bazelPath) => {
                    const command = `Running "${bazelPath.stdout.trim()} build ${buildTarget} --compilation_mode=${compilationMode} --cpu=${cpu} --linkopt='-Wl,-sdk ${sdkPath.stdout.trim()}'", patching output for workspace root at "${cwd}"`;
                    const buffer = zlib.gzipSync(command);
                    logger.log(`refresh dummy project: ${command}`);
                    fs.writeFileSync(dir + "/out.xcactivitylog", buffer);
                    vscode.window.showInformationMessage(`Current refresh command for InjectionIII: ${command}`);
                });
                
 
            });
        }
    });
}
