import * as process from "node:process";
import * as vscode from "vscode";
import configuration from "./configuration";
import { platformVariable, cpuVariable, PlatformTypes } from "./variables";

// export function tryGetCpu() {
//     getCpuRepeatly();
// }

// async function getCpuRepeatly() {
//     setTimeout(() => {
//         cpu().then(getCpuRepeatly);
//     }, 1000);
// }

export function updateCpu(iosTargetSdk: string|undefined) {
    let result = "";
    const platform = platformVariable.get() || PlatformTypes.ios;
    if (platform === PlatformTypes.macos) {
        const arch = process.arch;
        if ('arm64' === arch) {
            result = "darwin_arm64";
        } else if ('x64' === arch) {
            result = "darwin_x86_64";
        }
    } else {
        let sdk = iosTargetSdk;

        if (sdk === "iphonesimulator") {
            // Return empty string to bazel
            // It will use the current cpu properties of the current platform
            result = configuration.simulatorCpuString ?? "";
        } else {
            // Should not need support armv7?
            result = "ios_arm64";
        }
    }
    cpuVariable.update(result);
    return result;
}

export async function cpu() {
    return cpuVariable.get();
}
