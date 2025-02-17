// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as logger from "./logger";
import * as picker from "./picker";
import * as devicePicker from "./devicePicker";
import * as inputer from "./inputer";
import * as cpuProvider from "./cpuProvider";
import * as launchGenerator from "./launchGenerator";
import * as refreshInjection from "./refreshInjectioniiiProject";
import configuration from "./configuration";
import { BuildTaskProvider } from "./buildTaskProvider";
import { onDidChangeActiveTextEditorMaker } from "./refreshCompileCommands";
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
    queryLocationOfBUILD,
    isBisInstalled,
    touchBisBuild,
} from "./utils";
import LibDepsService from "./libdeps";
import LibPathService from "./libpath";
import WorkspaceService from "./workspace";
import { TreeProvider, ITreeItem } from "./treeProvider";
import * as pymobiledevice3 from "./pymobiledevice3";

import * as debugConfigProvider from "./debugConfigProvider";
import { DaemonServerTreeProvider } from "./tunneldTreeProvide";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    logger.activate();

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
    pymobiledevice3.activate(context);

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
            "zxz-moe-bis.refreshDummyProjectForInjectionIII",
            refreshInjection.refreshInjectionIIIProject
        )
    );

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

    // Hook event
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(
            onDidChangeActiveTextEditorMaker()
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
    const daemonServerTreeProvider = new DaemonServerTreeProvider(context);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider("tunneld", daemonServerTreeProvider)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zxz-moe-bis.refreshConnectedDevices", () =>
            daemonServerTreeProvider.refreshDevices()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zxz-moe-bis.launchDaemonServer", () =>
            daemonServerTreeProvider.startDaemonServer()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zxz-moe-bis.stopDaemonServer", () =>
            daemonServerTreeProvider.stopDaemonServer()
        )
    );

    // Debugger
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            "lldb",
            new debugConfigProvider.DebugConfigurationProvider()
        )
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
        vscode.workspace.workspaceFolders?.forEach((folder) => {
            deleteCompileCommandsFile(folder);
        });
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
            if (deviceVariable.get() && configuration.autoRefreshDummyProjectForInjectionIII) {
                logger.log("Auto refresh InjectionIII project");
                vscode.commands.executeCommand(
                    "zxz-moe-bis.refreshDummyProjectForInjectionIII"
                );
            }
            treeProvider.refresh();

            vscode.workspace.workspaceFolders?.forEach((folder) => {
                deleteCompileCommandsFile(folder);
            });
        });

    isBisInstalled()
        .then(() => {
            touchBisBuild();
        })
        .catch((error) => {
            vscode.window.showInformationMessage("Bis rule not detected");
            logger.log(
                "If you confirmed you have installed, try running \nbazel query '@bis//:setup'\nin your command line"
            );
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
