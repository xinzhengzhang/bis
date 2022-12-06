import exp = require("constants");
import * as vscode from "vscode";

const configuration = {
    get simulatorCpuString(): string | undefined {
        return vscode.workspace.getConfiguration("bis").get<string>("simulator_cpu_string");
    },
    get prebuildSwiftWhenIndexing(): boolean {
        return vscode.workspace.getConfiguration("bis").get<boolean>("prebuild_swift_when_indexing") ?? true;
    },
    get autoGenerateLaunchJson(): boolean {
        return vscode.workspace.getConfiguration("bis").get<boolean>("auto_generate_launch_json") ?? true;
    },
    get bazelBackgroundOutputBase(): string {
        return vscode.workspace.getConfiguration("bis").get<string>("bazel_background_output_base") ?? "/tmp/.bis_cache";
    }
};

export default configuration;