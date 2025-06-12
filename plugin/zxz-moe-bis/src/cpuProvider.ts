import * as vscode from "vscode";
import * as process from "node:process";
import { Target } from "./commonTypes";
import configuration from "./configuration";
import { cpuVariable, deviceVariable } from "./variables";

export function updateCpu(device: Target | undefined) {
    let result = "";
    let sdk = device?.sdk;
    if (sdk === "macosx") {
        const arch = process.arch;
        if ("arm64" === arch) {
            result = "darwin_arm64";
        } else if ("x64" === arch) {
            result = "darwin_x86_64";
        }
    } else if (sdk === "iphonesimulator") {
        // Return empty string to bazel
        // It will use the current cpu properties of the current platform
        result = configuration.simulatorCpuString ?? "sim_arm64";
        if (result.startsWith("ios_")) {
            // Remove ios_ prefix
            // We migrate from --cpu to --ios_multi_cpus and we do not need the prefix anymore
            result = result.replace(/^ios_/, "");
        }
    } else {
        // Should not need support armv7?
        result = "arm64";
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
