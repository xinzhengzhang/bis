import * as vscode from "vscode";
import * as picker from "./picker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as logger from "./logger";
import * as zlib from "node:zlib";
import * as fs from "fs";
import * as os from "os";

import { isBisWorkspace } from "./utils";
import { execFile as origin_execFile } from "node:child_process";
import { promisify } from "util";
import configuration from "./configuration";
import { isAbsolute, join } from "node:path";

const execFile = promisify(origin_execFile);
export async function refreshInjectionIIIProject() {

    const buildTarget = await inputer.buildTarget();
    const compilationMode = (await picker.compilationMode()) ?? "dbg";
    const cpu = await cpuProvider.cpu();
    const targetSdk: string = await vscode.commands.executeCommand("ios-debug.targetSdk");

    vscode.workspace.workspaceFolders?.forEach(async (value) => {
        if (isBisWorkspace(value)) {
            const buildType: string = "bis.build";
            const cwd = value.uri.fsPath;

            let dir = join(cwd, "/bis-dummy.xcodeproj");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            dir = join(os.homedir(), "Library/Developer/Xcode/DerivedData/bis-dummy-log/Logs/Build");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            let { stdout } = await execFile("xcrun",
                ["--sdk", targetSdk ?? "iphonesimulator", "--show-sdk-path"], {
                shell: true,
                cwd: cwd
            });
            const sdkPath = stdout.trim();
            const bazelPathConfig = configuration.bazelExecutablePath;
            var bazelPath: string;
            if (isAbsolute(bazelPathConfig)) {
                bazelPath = bazelPathConfig;
            } else {
                let { stdout: bazelPathFound } = await execFile("which", [configuration.bazelExecutablePath],
                    { shell: true, cwd: cwd });
                bazelPath = bazelPathFound.trim();
            }
            if (bazelPath.length === 0) {
                throw new Error("Cannot find the bazel");
            }
            const command = `Running "${bazelPath} build ${buildTarget} --compilation_mode=${compilationMode} --cpu=${cpu} --linkopt='-Wl,-sdk ${sdkPath}'", patching output for workspace root at "${cwd}"`;
            const buffer = zlib.gzipSync(command);
            logger.log(`refresh dummy project: ${command}`);
            fs.writeFileSync(join(dir, "out.xcactivitylog"), buffer);
            vscode.window.showInformationMessage(`Current refresh command for InjectionIII: ${command}`);
        }
    });
}
