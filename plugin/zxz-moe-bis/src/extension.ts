// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as logger from "./logger";
import * as picker from "./picker";
import * as devicePicker from "./devicePicker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as launchGenerator from "./launchGenerator";
import * as sync from "./sync";
import configuration from "./configuration";
import { BuildTaskProvider } from "./buildTaskProvider";
import {
    targetVariable,
    compilationModeVariable,
    cpuVariable,
    deviceVariable,
} from "./variables";
import * as eventEmitter from "./eventEmitter";
import { combineLatest, distinctUntilChanged, filter, skip } from "rxjs";
import { isEqual } from "lodash";
import {
    deleteCompileCommandsFile,
} from "./utils";
import {
    touchBisBuild,
    isBisInstalled,
    queryLocationOfBUILD,
} from "./cmds";
import LibDepsService from "./libdeps";
import LibPathService from "./libpath";
import WorkspaceService from "./workspace";
import { TreeProvider, ITreeItem } from "./treeProvider";

import * as debugConfigProvider from "./debugConfigProvider";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    logger.activate();

    isBisInstalled()
        .then(() => {
            touchBisBuild();
            _activate(context);
        })
        .catch((error) => {
            vscode.window.setStatusBarMessage(
                "Bis rule not detected, please install bis in bazel module first",
                5000
            );
            logger.log(
                "If you confirmed you have installed, try running \nbazel query '@bis//:setup'\nin your command line"
            );
        });
}

function _activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "zxz-moe-bis" is now active!');

    // Component
    // UI
    targetVariable.active(context);
    compilationModeVariable.active(context);
    deviceVariable.active(context);
    cpuVariable.active(context);
    picker.activate(context);
    devicePicker.activate(context);
    inputer.activate(context);
    cpuProvider.activate(context);
    eventEmitter.activate(context);

    // Debugger
    debugConfigProvider.activate(context);

    // Commands get variable
    context.subscriptions.push(
        vscode.commands.registerCommand("zxz-moe-bis.cpu", cpuProvider.cpu)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.compilationMode",
            picker.compilationMode
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.buildTarget",
            inputer.buildTarget
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.selectDevice",
            devicePicker.selectDevice
        )
    );

    // Commands action
    WorkspaceService.setup(context);
    LibPathService.setup(context);
    LibDepsService.setup(context);

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.build",
            (task: vscode.Task) => {
                vscode.tasks.executeTask(task);
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.generateLaunchJson",
            launchGenerator.generate
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.syncCompileCommandsAndRestartLsp",
            sync.sync
        )
    )

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.pickCompilationMode",
            picker.pickCompilationMode
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zxz-moe-bis.inputBuildTarget",
            inputer.inputBuildTarget
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("zxz-moe-bis.targetSdk", () => {
            const target = deviceVariable.get();
            return target?.sdk ?? "iphonesimulator";
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("zxz-moe-bis.targetUDID", () => {
            const target = deviceVariable.get();
            return target?.udid ?? "";
        })
    );

    // Task Provider
    context.subscriptions.push(
        vscode.tasks.registerTaskProvider(
            BuildTaskProvider.scriptType,
            new BuildTaskProvider()
        )
    );

    // View
    const treeProvider = new TreeProvider(context);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider("buildWorkspace", treeProvider)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zxz-moe-bis.refreshTreeViewer", () => {
            if (!deviceVariable.get()) {
                devicePicker.selectDevice();
                // deviceVariable will trigger the treeProvider.refresh() in the next tick
                return;
            }
            if (!targetVariable.get()) {
                inputer.inputBuildTarget();
                // targetVariable will trigger the treeProvider.refresh()
                return;
            }
            treeProvider.refresh();
        }
        ),

        vscode.commands.registerCommand("zxz-moe-bis.revealTargetInBUILD", (item: ITreeItem) => {
            logger.log(JSON.stringify(item));
            const path = item.getPath();
            // @@loktar//srcs/services/biz/account:some_target
            if (path?.startsWith("@@")) {
                // show a progress
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Revealing ${path}...`,
                    cancellable: false
                }, async () => {
                    try {
                        const location = await queryLocationOfBUILD(path);
                        logger.log("BUILD file found: ", location);
                        // location: /Users/loktar/loktar_ext/loktar/srcs/services/biz/account/BUILD:12:5
                        const [file, line, col] = location.split(':');
                        const uri = vscode.Uri.file(file);
                        // Open file
                        const doc = await vscode.workspace.openTextDocument(uri);
                        logger.log("opened doc: ", doc.fileName);
                        await vscode.window.showTextDocument(doc, {
                            selection: new vscode.Range(parseInt(line) - 1, 0, parseInt(line) - 1, parseInt(col))
                        });
                    } catch (error) {
                        logger.error(error);
                    }
                });

            }
        })

    );

    // Debugger
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            "lldb-dap",
            new debugConfigProvider.DebugConfigurationProvider()
        )
    );
    context.subscriptions.push(
        vscode.debug.onDidTerminateDebugSession((session) => {
            console.log('Debug session ended:', session);
            const idevicesyslog_proc: number = session.configuration.idevicesyslog_proc;
            if (idevicesyslog_proc) {
                process.kill(idevicesyslog_proc);
                logger.log(`Terminating idevicesyslog process: ${idevicesyslog_proc}`);
            }
        })
    );

    // Rx
    deviceVariable
        .asObservable()
        .pipe(distinctUntilChanged(isEqual))
        .pipe(skip(1))
        .subscribe((d) => {
            targetVariable.update(undefined);
            if (d !== undefined) {
                cpuProvider.updateCpu(d);
                vscode.commands.executeCommand("zxz-moe-bis.inputBuildTarget");
            }
        });

    eventEmitter.buildFileChangedEmitter.subscribe((file) => {
        if (configuration.autoRefreshTreeViewerWhenConfigurationChanged) {
            treeProvider.refresh();
        }
    });
    combineLatest([
        targetVariable.asObservable().pipe(filter((x) => x !== undefined)),
        compilationModeVariable.asObservable(),
        cpuVariable.asObservable().pipe(filter((x) => x !== undefined)),
    ])
        .pipe(distinctUntilChanged(isEqual))
        .pipe(skip(1))
        .subscribe(([target, compilationMode, cpu]) => {
            logger.log(
                `Diff detected target = ${target},\n
                 compilationMode = ${compilationMode},\n
                 device = ${deviceVariable.get()}\n
                 cpu = ${cpu}`
            );
            if (deviceVariable.get() && configuration.autoGenerateLaunchJson) {
                logger.log("Auto generate LaunchJson");
                vscode.commands.executeCommand(
                    "zxz-moe-bis.generateLaunchJson"
                );
            }
            treeProvider.refresh();

            vscode.workspace.workspaceFolders?.forEach((folder) => {
                deleteCompileCommandsFile(folder);
            });
        });

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration("bis.simulator_cpu_string")) {
                cpuProvider.updateCpu(deviceVariable.get());
            }
        })
    );
}

export function deactivate() { }
