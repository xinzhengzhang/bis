import * as vscode from "vscode";
import * as logger from "./logger";
import { platformVariable, PlatformTypes } from "./variables";

let context: vscode.ExtensionContext;
let selector: vscode.StatusBarItem;

// Status bar
function setupStatusBarPicker() {
    selector.command = "zxz-moe-bis.selectPlatform";
    selector.tooltip = "Select target Platform";

    let platform = platformVariable.get();
    _updateSelectorHint(platform || PlatformTypes.ios);
    selector.show();
}

export async function select(): Promise<string | undefined> {
    const platform = await vscode.window.showQuickPick([PlatformTypes.macos, PlatformTypes.ios],
        { placeHolder: 'Select Platform:', canPickMany: false,  });

    if (platform) {
        await _update(platform as PlatformTypes);
        logger.log("Selected target platform", platform);
    }

    return platform;
}

export async function targetPlatform() {
    return _getOrSelectTargetPlatform();
}

export function activate(c: vscode.ExtensionContext) {
    context = c;
    selector = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    setupStatusBarPicker();
}

async function _getOrSelectTargetPlatform(): Promise<PlatformTypes> {
    let platform: PlatformTypes | undefined = platformVariable.get();
    if (!platform) {
        return select().then((v) => v as PlatformTypes);
    }
    return platform;
}
function _updateSelectorHint(platform: PlatformTypes) {
    selector.text = `${platform === PlatformTypes.macos ? '$(device-desktop)' : '$(device-mobile)' } ${platform}`;
}
// Storage
async function _update(platform: PlatformTypes) {
    platformVariable.update(platform);
    _updateSelectorHint(platform);
}
