import exp = require("constants");
import * as vscode from "vscode";
import * as logger from "./logger";
import { targetVariable } from "./variables";
import { exec } from "child_process";
import {
    executeBazelCommands,
    WriteStream,
    WriteStreamType,
} from "./utils";
import configuration from "./configuration";

const LABEL_REGEX = RegExp("@?[\\w-]*//[\\w-/]*:[\\w-]+");

let context: vscode.ExtensionContext;
let statusBarTargetInputer: vscode.StatusBarItem;

// Status bar

function setupStatusBarInputer() {
    statusBarTargetInputer.command = "zxz-moe-bis.inputBuildTarget";
    statusBarTargetInputer.tooltip = "Input build target for debugging";

    let target: string | undefined = targetVariable.get();

    if (target && target.match(LABEL_REGEX)) {
        _updateLabel(target);
        statusBarTargetInputer.text = target;
    } else {
        statusBarTargetInputer.text = "No target specified";
    }
    statusBarTargetInputer.show();
}

function execResult(folderString: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        let result: string[] = [];
        const process = executeBazelCommands(
            ["query", `'kind("${configuration.targetQueryKindFilter}", "//...")'`, "--output=label"],
            folderString,
            (exception, stdout, stderr) => {
                if (stdout) {
                    const splited = stdout.split(/\r?\n/);
                    splited.forEach((str) => {
                        if (!str) {
                            return;
                        }
                        result.push(str);
                    });
                    resolve(result);
                } else {
                    if (exception) {
                        logger.error(exception);
                    }
                    reject(exception);
                }
            }
        );
        process.stdout?.pipe(new WriteStream(WriteStreamType.stdout));
        process.stderr?.pipe(new WriteStream(WriteStreamType.stderr));
    });
}

async function getAlliOSApplicationLabels() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
        return [];
    }

    return new Promise<string[]>(async (resolve) => {
        const result: string[] = [];
        for (const workspaceFolder of workspaceFolders) {
            const folderString = workspaceFolder.uri.fsPath;
            try {
                const r = await execResult(folderString);
                result.push(...r);
            } catch (error) {
                logger.error(error);
            }
        }
        resolve(result);
    });
}

export async function inputBuildTarget() {
    let quickPickOptions: vscode.QuickPickOptions = {
        title: "Select build target",
        matchOnDescription: true,
        placeHolder: "Choose your ios_application",
    };

    let choose = await vscode.window.showQuickPick(
        getAlliOSApplicationLabels(),
        quickPickOptions
    );

    if (choose) {
        await _updateLabel(choose);

        logger.log("Choose label: ", choose);
        return choose;
    } else {
        let options: vscode.InputBoxOptions = {
            title: "Input label of target",
            value: targetVariable.get(),
            prompt: "@<WORKSPACE>//:<PATH>",
            validateInput(value) {
                let message: vscode.InputBoxValidationMessage = {
                    message: "Unexpected label format",
                    severity: vscode.InputBoxValidationSeverity.Warning,
                };
                return value.match(LABEL_REGEX) ? null : message;
            },
            ignoreFocusOut: true,
        };

        let label = await vscode.window.showInputBox(options);

        if (label) {
            await _updateLabel(label);
        }

        logger.log("Input label: ", label);
        return label;
    }
}

export async function buildTarget() {
    return _getOrInputLabel();
}

export function activate(c: vscode.ExtensionContext) {
    context = c;
    statusBarTargetInputer = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        0
    );
    setupStatusBarInputer();
}

async function _getOrInputLabel() {
    let labelString: string | undefined = targetVariable.get();
    if (!labelString) {
        return inputBuildTarget();
    }
    return labelString;
}

async function _updateLabel(labelString: string) {
    targetVariable.update(labelString);
    statusBarTargetInputer.text = labelString;
}
