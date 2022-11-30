import exp = require('constants');
import * as vscode from 'vscode';
import * as logger from './logger';
import configuration from './configuration';

const SELECTED_COMPILATION_MODE_KEY = "selected_compilation_mode";

let context: vscode.ExtensionContext;
let statusBarCompilationModePicker: vscode.StatusBarItem;

enum CompilationMode {
    dbg = "dbg",
    opt = "opt",
}

// Status bar

function setupStatusBarPicker()
{
    statusBarCompilationModePicker.command = "zxz-moe-bis.pickCompilationMode";
    statusBarCompilationModePicker.tooltip = "Select iOS compilcation mode for debugging";
    if (configuration.compilationMode && configuration.compilationMode in CompilationMode)
    {
        _updateCompilationMode(configuration.compilationMode);
        statusBarCompilationModePicker.text = configuration.compilationMode;
    }
    else
    {
        statusBarCompilationModePicker.text = CompilationMode.dbg;
    }
    statusBarCompilationModePicker.show();
}

export async function pickCompilationMode()
{
    let options = Object.values(CompilationMode);

    let quickPickOptions: vscode.QuickPickOptions = {
        title: "Select compilation mode",
        matchOnDescription: true,
    };

    let choose = (await vscode.window.showQuickPick(options, quickPickOptions));

    if (choose) {
        await _updateCompilationMode(choose);
    }

    logger.log("Picked compilation mode", choose);
    return choose;
}

export async function compilationMode()
{
    return _getOrPickCompilationMode();
}

export function activate(c: vscode.ExtensionContext)
{
    context = c;
    statusBarCompilationModePicker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    setupStatusBarPicker();

    return vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("bis.compilation_mode")) {
            setupStatusBarPicker();
        }
    });
}

async function _getOrPickCompilationMode()
{
    let compilationMode: CompilationMode|undefined = context.workspaceState.get(SELECTED_COMPILATION_MODE_KEY);
    if (!compilationMode)
    {
        return pickCompilationMode();
    }
    return compilationMode;
}

// Storage
async function _updateCompilationMode(compilationMode: string)
{
    await context.workspaceState.update(SELECTED_COMPILATION_MODE_KEY, compilationMode);
    statusBarCompilationModePicker.text = compilationMode;
}