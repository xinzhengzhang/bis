/**
 * copy of vscode-ios-debug/src/debugConfigProvider.ts
 */
import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";
import * as logger from "./logger";
import { Device, Target, TargetType } from "./commonTypes";
import * as targets from "./targets";
import * as simulatorFocus from "./simulatorFocus";
import { getTargetFromUDID, lastSelected, selectDevice } from "./devicePicker";

let context: vscode.ExtensionContext;

const lldbPlatform: { [T in TargetType]: string } = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Simulator: "ios-simulator",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Device: "remote-ios",
};

const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function randomString() {
    let random;

    try {
        random = crypto.randomBytes(16);
    } catch (e) {
        random = crypto.pseudoRandomBytes(16);
    }

    return random.toString("hex");
}

function getOutputBasename() {
    return path.join("/tmp", `ios-${randomString()}`);
}

export class DebugConfigurationProvider
    implements vscode.DebugConfigurationProvider {
    private async getTarget(iosTarget: string): Promise<Target | undefined> {
        if (iosTarget === "select") {
            return await selectDevice();
        } else if (iosTarget === "last-selected") {
            return await lastSelected();
        } else if (typeof iosTarget === "string") {
            return await getTargetFromUDID(iosTarget);
        }

        return undefined;
    }

    async resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        dbgConfig: vscode.DebugConfiguration,
        token: vscode.CancellationToken
    ) {
        if (!dbgConfig.iosTarget) {
            // assume: running 'program' in local device
            dbgConfig.internalConsoleOptions = "openOnSessionStart";
            dbgConfig.console = "internalConsole";
            dbgConfig.waitFor = true;
        } else {
            // runing on remote device: iphone device or simulator
            let target: Target | undefined = await this.getTarget(
                dbgConfig.iosTarget
            );
            if (!target) {
                return null;
            }

            dbgConfig.iosTarget = target;

            dbgConfig.iosRequest = dbgConfig.request;
            dbgConfig.request =
                target.type === "Simulator" ? "attach" : dbgConfig.request;

            dbgConfig.initCommands =
                dbgConfig.initCommands instanceof Array
                    ? dbgConfig.initCommands
                    : [];

            dbgConfig.initCommands.unshift(
                `command script import '${context.asAbsolutePath(
                    "lldb/file_monitor.py"
                )}'`
            );
            dbgConfig.initCommands.unshift(
                `command script import '${context.asAbsolutePath(
                    "lldb/simulator_focus.py"
                )}'`
            );
            dbgConfig.initCommands.unshift(
                `platform select ${lldbPlatform[target.type]}`
            );
        }
        logger.log("resolveDebugConfiguration", dbgConfig);

        return dbgConfig;
    }

    async resolveDebugConfigurationWithSubstitutedVariables(
        folder: vscode.WorkspaceFolder | undefined,
        dbgConfig: vscode.DebugConfiguration,
        token: vscode.CancellationToken
    ) {
        logger.log(
            "resolveDebugConfigurationWithSubstitutedVariables",
            dbgConfig
        );

        if (dbgConfig.sessionName) {
            dbgConfig.name = dbgConfig.sessionName;
        }
        if (!dbgConfig.iosTarget) {
            // no additional config for local debugging process
            return dbgConfig;
        }

        // Enable OS_ACTIVITY_DT_MODE by default unless disabled for both Simulator and Device
        // This is required for logging to work properly
        dbgConfig.env = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            OS_ACTIVITY_DT_MODE: "YES",
            ...dbgConfig.env,
        };

        let target: Target = dbgConfig.iosTarget;

        if (target.type === "Simulator") {
            let pid: string | void;

            // Check if we have enough permissions for the simulator focus monitor.
            let enableSimulatorFocusMonitor =
                vscode.workspace
                    .getConfiguration()
                    .get("ios-debug.focusSimulator") &&
                (await simulatorFocus.tryEnsurePermissions());

            if (dbgConfig.iosRequest === "launch") {
                let outputBasename = getOutputBasename();
                let stdout = `${outputBasename}-stdout`;
                let stderr = `${outputBasename}-stderr`;

                pid = await targets.simulatorInstallAndLaunch({
                    udid: target.udid,
                    path: dbgConfig.program,
                    bundleId: dbgConfig.iosBundleId,
                    env: dbgConfig.env,
                    args: dbgConfig.args,
                    stdio: { stdout, stderr },
                    waitForDebugger: true,
                });

                dbgConfig.initCommands.push(`monitor_file ${stdout}`);
                dbgConfig.initCommands.push(`monitor_file ${stderr}`);
            } else {
                pid = await targets.simulatorGetPidFor({
                    udid: target.udid,
                    bundleId: dbgConfig.iosBundleId,
                });
            }

            if (!pid) {
                return null;
            }

            dbgConfig.pid = Number(pid);

            if (enableSimulatorFocusMonitor) {
                dbgConfig.preRunCommands =
                    dbgConfig.preRunCommands instanceof Array
                        ? dbgConfig.preRunCommands
                        : [];
                dbgConfig.preRunCommands.push(
                    `simulator-focus-monitor ${target.name} – ${target.runtime}`
                );
            }

            delete dbgConfig.program;
            delete dbgConfig.env;
            delete dbgConfig.args;
        } else if (target.type === "Device") {
            let platformPath: string | void;
            if (dbgConfig.iosRequest === "launch") {
                //FIXME: In Bazel, since program is a build output path, it is likely to be an outdated version when the cache is hit, resulting in the installed app not matching expectations. However, codelldb only accepts an already-unpacked app bundle, and if the extension handles the unpacking, there currently isn't a good cleanup strategy.
                let programPath = dbgConfig.program;
                if (dbgConfig.type === "lldb-dap" && dbgConfig.ipaPath) {
                    programPath = dbgConfig.ipaPath;
                }
                platformPath = await targets.deviceInstall(
                    target as Device,
                    programPath,
                    dbgConfig.iosBundleId
                );
            } else {
                platformPath = await targets.deviceAppPath(
                    target.udid,
                    dbgConfig.iosBundleId,
                );
            }

            if (!platformPath) {
                return null;
            }

            let outputBasename = getOutputBasename();
            let logPath = `${outputBasename}-log`;

            let pid: Number | undefined;
            const tryLaunchApp = async () => {
                const launchPid = await targets.launchApp(target.udid, dbgConfig.iosBundleId, logPath);
                if (!launchPid) {
                    dbgConfig.initCommands.push(`monitor_file ${logPath}`);
                }
                return launchPid;
            };

            if (dbgConfig.iosRequest === "launch") {
                pid = await tryLaunchApp();
            }
            if (pid === undefined) {
                pid = await targets.deviceGetPidFor({
                    udid: target.udid,
                    appPath: platformPath,
                });
                // If the process is attach and app not running, try to launch it.
                if (pid === undefined && dbgConfig.iosRequest === "attach") {
                    await tryLaunchApp();
                    if (pid == undefined) {
                        pid = await targets.deviceGetPidFor({
                            udid: target.udid,
                            appPath: platformPath,
                        });
                    }
                }
            }

            if (!pid) {
                return null;
            }

            dbgConfig.preRunCommands =
                dbgConfig.preRunCommands instanceof Array
                    ? dbgConfig.preRunCommands
                    : [];

            dbgConfig.preRunCommands.push(
                `script lldb.target.module[0].SetPlatformFileSpec(lldb.SBFileSpec('${platformPath}'))`
            );
            if (dbgConfig.iosRequest === "launch") {
                dbgConfig.launchCommands = [
                    `device select ${target.udid}`,
                    `device process attach --continue --pid ${pid}`
                ];
            } else {
                dbgConfig.attachCommands = [
                    `device select ${target.udid}`,
                    `device process attach --continue --pid ${pid}`
                ];
            }

            if (dbgConfig.env) {
                let newEnv: { [key: string]: string } = {};
                for (let key in dbgConfig.env) {
                    newEnv[key] = dbgConfig.env[key].replace(
                        "__TESTHOST__",
                        platformPath
                    );
                }
                dbgConfig.env = newEnv;
            }
        }

        logger.log("resolved debug configuration", dbgConfig);
        return dbgConfig;
    }
}

export function activate(c: vscode.ExtensionContext) {
    context = c;
}
