// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as logger from "./logger";
import * as picker from "./picker";
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
} from "./variables";
import { combineLatest, distinctUntilChanged, filter, skip } from "rxjs";
import { isEqual } from "lodash";
import { isBisInstalled, touchBisBuild } from "./utils";
import LibDepsService from "./libdeps";
import LibPathService from "./libpath";
import WorkspaceService from './workspace';
import { TreeProvider } from "./treeProvider";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    logger.activate();

    console.log('Congratulations, your extension "zxz-moe-bis" is now active!');

    // Component
    targetVariable.active(context);
    compilationModeVariable.active(context);
    picker.activate(context);
    inputer.activate(context);
    
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
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider("buildWorkspace", new TreeProvider(context))
    );

    // Auto generateLaunchJson
    combineLatest([
        targetVariable.subject.pipe(filter((x) => x !== undefined)),
        compilationModeVariable.subject,
        cpuVariable.subject.pipe(filter((x) => x !== undefined)),
    ])
        .pipe(distinctUntilChanged(isEqual))
        .pipe(skip(1))
        .subscribe(([target, compilationMode, cpu]) => {
            logger.log(
                `Diff detected target = ${target} compilationMode = ${compilationMode} cpu = ${cpu}`
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
        });
    
    isBisInstalled().then(()=>{
        touchBisBuild();
        // Try to get CPU info if bis installed
        cpuProvider.tryGetCpu();
    }).catch(error => {
        vscode.window.showInformationMessage("Bis rule not detected");
        logger.log("If you confirmed you have installed, try running \nbazel query '@bis//:setup'\nin your command line");
    });
}

export function deactivate() { }
