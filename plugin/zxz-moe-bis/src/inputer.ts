import * as vscode from "vscode";
import * as logger from "./logger";
import { deviceVariable, targetVariable } from "./variables";
import { executeBazelCommands, WriteStream, WriteStreamType } from "./utils";
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
    } else {
        _updateLabel(undefined);
    }
    statusBarTargetInputer.show();
}

function execResult(sdk: string, folderString: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        let result: string[] = [];
        let kindFilter;
        if (sdk === "iphoneos" || sdk === "iphonesimulator") {
            kindFilter = "ios_application|ios_unit_test";
        } else if (sdk === "macosx") {
            kindFilter =
                "macos_application|macos_command_line_application|cc_binary|swift_binary|apple_universal_binary|cc_test";
        } else {
            reject("Unsupported yet");
            return;
        }
        const configFilter = configuration.targetQueryKindFilter;
        if (configFilter && kindFilter.indexOf(configFilter) === -1) {
            kindFilter += "|" + configFilter;
        }
        const process = executeBazelCommands(
            "query",
            [
                `'kind("${kindFilter}", "//...")'`,
                "--output=label_kind",
            ],
            [],
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

async function getDeviceSDKCompatibleLabels(sdk: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
        return [];
    }

    return new Promise<string[]>(async (resolve) => {
        const result: string[] = [];
        for (const workspaceFolder of workspaceFolders) {
            const folderString = workspaceFolder.uri.fsPath;
            try {
                const r = await execResult(sdk, folderString);
                result.push(...r);
            } catch (error) {
                logger.error(error);
            }
        }
        resolve(result);
    });
}

export async function inputBuildTarget() {
    const sdk = deviceVariable.get()?.sdk || "iphonesimulator";
    let quickPickOptions: vscode.QuickPickOptions = {
        title: "Select build target",
        matchOnDescription: true,
        placeHolder: "Choose your target for sdk: " + sdk,
    };

    let choose = await vscode.window.showQuickPick(
        getDeviceSDKCompatibleLabels(sdk).then<vscode.QuickPickItem[]>(
            (labels): vscode.QuickPickItem[] => {
                return labels.map((label) => {
                    const matches = label.match("(.*) rule (.*)");
                    let rule = "";
                    let target = "";
                    let kind = vscode.QuickPickItemKind.Separator;
                    if (matches) {
                        kind = vscode.QuickPickItemKind.Default;
                        rule = matches[1];
                        target = matches[2];
                    }
                    return {
                        label: target,
                        kind: kind,
                        description: matches ? `(${rule})` : undefined,
                    };
                });
            }
        ),
        quickPickOptions
    );

    if (choose) {
        await _updateLabel(choose.label);

        logger.log("Choose label: ", choose);
        return choose.label;
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

async function _updateLabel(labelString: string | undefined) {
    targetVariable.update(labelString);
    if (labelString) {
        statusBarTargetInputer.text = `$(target) ${labelString}`;
    } else {
        statusBarTargetInputer.text = "No target specified";
    }
}
