import exp = require("constants");
import * as vscode from "vscode";
import * as logger from "./logger";
import { compilationModeVariable, CompilationMode } from "./variables";

let context: vscode.ExtensionContext;
let statusBarCompilationModePicker: vscode.StatusBarItem;

// Status bar
function setupStatusBarPicker() {
    statusBarCompilationModePicker.command = "zxz-moe-bis.pickCompilationMode";
    statusBarCompilationModePicker.tooltip =
        "Select iOS compilcation mode for debugging";

    let compilationMode: string | undefined = compilationModeVariable.get();

    if (compilationMode && compilationMode in CompilationMode) {
        _updateCompilationMode(compilationMode);
    } else {
        _updateCompilationMode(CompilationMode.dbg);
    }
    statusBarCompilationModePicker.show();
}

export async function pickCompilationMode() {
    let options = Object.values(CompilationMode);

    let quickPickOptions: vscode.QuickPickOptions = {
        title: "Select compilation mode",
        matchOnDescription: true,
        ignoreFocusOut: true,
    };

    let choose = await vscode.window.showQuickPick(options, quickPickOptions);

    if (choose) {
        await _updateCompilationMode(choose);
    }

    logger.log("Picked compilation mode", choose);
    return choose;
}

export async function compilationMode() {
    return _getOrPickCompilationMode();
}

export function activate(c: vscode.ExtensionContext) {
    context = c;
    statusBarCompilationModePicker = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        0
    );
    setupStatusBarPicker();
}

async function _getOrPickCompilationMode() {
    let compilationMode: CompilationMode | undefined =
        compilationModeVariable.get();
    if (!compilationMode) {
        return pickCompilationMode();
    }
    return compilationMode;
}

// Storage
async function _updateCompilationMode(compilationMode: string) {
    compilationModeVariable.update(compilationMode as CompilationMode);
    statusBarCompilationModePicker.text = `$(gear) ${compilationMode}`;
}
