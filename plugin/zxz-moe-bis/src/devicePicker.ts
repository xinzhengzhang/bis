import * as os from "node:os";
import * as vscode from "vscode";
import { Device, Simulator, Target } from "vscode-ios-debug/src/commonTypes";
import * as iosTargets from "vscode-ios-debug/src/targets";
import * as logger from "./logger";
import { macOSVersions } from "./utils";
import { deviceVariable } from "./variables";

interface TargetDeviceQuickPickItem extends vscode.QuickPickItem {
    target: Target;
}

let devicePickerStatusBarIndiator: vscode.StatusBarItem;

export function activate(c: vscode.ExtensionContext) {
    devicePickerStatusBarIndiator = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        0
    );
    devicePickerStatusBarIndiator.command = "zxz-moe-bis.selectDevice";
    devicePickerStatusBarIndiator.tooltip = "Select target device";
    _updateIndiator(deviceVariable.get());
    devicePickerStatusBarIndiator.show();
    c.subscriptions.push({
        dispose: devicePickerStatusBarIndiator.dispose,
    });
}
export function lastSelected(): Promise<Target | undefined> {
    const selected = deviceVariable.get();
    if (!selected) {
        return selectDevice();
    }
    return Promise.resolve(selected);
}

export async function getTargetFromUDID(udid: string) {
    const selected = deviceVariable.get();
    if (selected && selected.udid === udid) {
        return selected;
    }
    let device = (await listAllDevices()).find((t: Target) => t.udid === udid);

    if (device && device.udid) {
        _update(device);
    }
    logger.log(`Got target for udid: ${udid}`, device);

    return device;
}
export async function listAllDevices(): Promise<Array<Target>> {
    return [await _localDevice(), ...(await iosTargets.listTargets())];
}

export async function selectDevice(): Promise<Target | undefined> {
    let quickPickItems = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Loading devices...",
            cancellable: false,
        },
        async (progress) => {
            progress.report({ message: "loading..." });
            return [await _localDevice(), ...(await iosTargets.listTargets())]
                .sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type.localeCompare(b.type);
                    }
                    if (a.type === "Simulator") {
                        const simA = a as Simulator;
                        const simB = b as Simulator;
                        if (simA.state !== simB.state) {
                            return simA.state === "Booted"
                                ? -1
                                : simB.state === "Booted"
                                ? 1
                                : 0;
                        }
                    }
                    return a.name.localeCompare(b.name);
                })
                .map(
                    (t): TargetDeviceQuickPickItem => ({
                        label: t.name,
                        description:
                            t.type === "Simulator"
                                ? (t as Simulator).state === "Booted"
                                    ? "Booted"
                                    : ""
                                : (t as Device).modelName,
                        detail: `${t.type} ‧ ${t.runtime}`,
                        target: t,
                    })
                );
        }
    );

    let quickPickOptions: vscode.QuickPickOptions = {
        title: "Select device Target:",
        matchOnDescription: true,
    };

    let target = (
        await vscode.window.showQuickPick(quickPickItems, quickPickOptions)
    )?.target;

    logger.log("Picked target", target);

    _update(target);
    return target;
}
function _update(target: Target | undefined) {
    deviceVariable.update(target);
    _updateIndiator(target);
}

function _updateIndiator(target: Target | undefined) {
    if (target && target.sdk === "macosx") {
        devicePickerStatusBarIndiator.text = `$(device-desktop) ${
            (target as Device).modelName
        }`;
    } else if (target && target.udid) {
        devicePickerStatusBarIndiator.text = `$(device-mobile) ${target.name}`;
    } else {
        devicePickerStatusBarIndiator.text = `$(device-mobile) No selected device`;
    }
}

async function _localDevice(): Promise<Device> {
    const userInfo = os.userInfo({ encoding: "utf8" });
    const versions = await macOSVersions();
    return {
        udid: `${userInfo.gid}-${userInfo.uid}`,
        name: os.hostname(),
        type: "Device",
        version: versions.version,
        buildVersion: versions.buildVersion,
        runtime: `${os.type()} ${os.arch()} ${os.release()}`,
        sdk: "macosx",
        modelName: versions.name + " " + versions.version,
    };
}
