import * as vscode from "vscode";
import * as process from "node:process";
import { Target } from "vscode-ios-debug/src/commonTypes";
import configuration from "./configuration";
import { cpuVariable, deviceVariable } from "./variables";

export function updateCpu(device: Target | undefined) {
    let result = "";
    let sdk = device?.sdk;
    if (sdk === "macosx") {
        const arch = process.arch;
        if ('arm64' === arch) {
            result = "darwin_arm64";
        } else if ('x64' === arch) {
            result = "darwin_x86_64";
        }
    } else if (sdk === "iphonesimulator") {
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

export function activate(c: vscode.ExtensionContext) {
    updateCpu(deviceVariable.get());
}

export function cpu() {
    return cpuVariable.get();
}
