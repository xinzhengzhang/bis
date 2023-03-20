import { log } from "node:console";
import * as vscode from "vscode";
import configuration from "./configuration";
import { cpuVariable } from "./variables";

export function tryGetCpu() {
    getCpuRepeatly();
}

async function getCpuRepeatly() {
    setTimeout(() => {
        cpu().then(getCpuRepeatly);
    }, 1000);
}

export async function cpu() {
    let sdk = await vscode.commands.executeCommand("ios-debug.targetSdk");
    let result = "";
    if (sdk === "iphonesimulator") {
        // Return empty string to bazel
        // It will use the current cpu properties of the current platform
        result = configuration.simulatorCpuString ?? "";
    } else {
        // Should not need support armv7?
        result = "ios_arm64";
    }
    cpuVariable.update(result);
    return result;
}
