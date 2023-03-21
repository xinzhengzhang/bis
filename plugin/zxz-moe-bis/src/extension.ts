// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as logger from "./logger";
import * as picker from "./picker";
import * as platformPicker from "./platformPicker";
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
    platformVariable,
} from "./variables";
import { combineLatest, distinctUntilChanged, filter, skip } from "rxjs";
import { isEqual } from "lodash";
import { isBisInstalled, touchBisBuild } from "./utils";
import LibDepsService from "./libdeps";
import LibPathService from "./libpath";
import WorkspaceService from './workspace';
import { TreeProvider } from "./treeProvider";

import * as targetPicker from "vscode-ios-debug/src/targetPicker";
import * as targetCommand from "vscode-ios-debug/src/targetCommand";
import * as debugConfigProvider from "vscode-ios-debug/src/debugConfigProvider";
import * as debugLifecycleManager from "vscode-ios-debug/src/debugLifecycleManager";
import * as iosDebugLogger from "vscode-ios-debug/src/logger";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    logger.activate();

    console.log('Congratulations, your extension "zxz-moe-bis" is now active!');

    // Component
    // UI
    iosDebugLogger.activate();
    targetVariable.active(context);
    compilationModeVariable.active(context);
    platformVariable.active(context);
    picker.activate(context);
    inputer.activate(context);
    platformPicker.activate(context);
    // TODO: @Yrom change status bar commands in targetPicker
    targetPicker.activate(context);

    targetCommand.activate(context);

    // Debugger
    debugConfigProvider.activate(context);
    debugLifecycleManager.activate(context);

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
            "zxz-moe-bis.selectPlatform",
            platformPicker.select
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
        vscode.commands.registerCommand(
            "zxz-moe-bis.targetSdk",
            async () => {
                return targetPicker.targetSdk().then((targetSdk) => {
                    cpuProvider.updateCpu(targetSdk);
                });
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'zxz-moe-bis.pickTarget',
            async () => {
                return targetPicker.pickTarget().then((target) => {
                    cpuProvider.updateCpu(target?.sdk);
                });
            }
        )
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
        vscode.commands.registerCommand(
            "zxz-moe-bis.refreshTreeViewer", () => treeProvider.refresh())
    );

    // Debugger
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('lldb', new debugConfigProvider.DebugConfigurationProvider())
    );

    // Auto generateLaunchJson
    combineLatest([
        targetVariable.subject.pipe(filter((x) => x !== undefined)),
        compilationModeVariable.subject,
        platformVariable.subject,
        cpuVariable.subject.pipe(filter((x) => x !== undefined)),
    ])
        .pipe(distinctUntilChanged(isEqual))
        .pipe(skip(1))
        .subscribe(([target, compilationMode, platform, cpu]) => {
            logger.log(
                `Diff detected target = ${target} compilationMode = ${compilationMode}, platform = ${platform}, cpu = ${cpu}`
            );
            if (configuration.autoGenerateLaunchJson) {
                logger.log("Auto generate LaunchJson");
                vscode.commands.executeCommand(
                    "zxz-moe-bis.generateLaunchJson"
                );
            }
            if (configuration.autoRefreshDummyProjectForInjectionIII) {
                logger.log("Auto refresh InjectionIII project");
                vscode.commands.executeCommand(
                    "zxz-moe-bis.refreshDummyProjectForInjectionIII"
                );
            }
            vscode.commands.executeCommand(
                "zxz-moe-bis.refreshTreeViewer"
            );
        });

    isBisInstalled().then(() => {
        touchBisBuild();
        // Try to get CPU info if bis installed
        // cpuProvider.tryGetCpu();
    }).catch(error => {
        vscode.window.showInformationMessage("Bis rule not detected");
        logger.log("If you confirmed you have installed, try running \nbazel query '@bis//:setup'\nin your command line");
    });
}

export function deactivate() { }
