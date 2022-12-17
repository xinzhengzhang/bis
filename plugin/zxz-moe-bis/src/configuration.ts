import exp = require("constants");
import * as vscode from "vscode";

const configuration = {
    get simulatorCpuString(): string | undefined {
        return vscode.workspace
            .getConfiguration("bis")
            .get<string>("simulator_cpu_string");
    },
    get prebuildSwiftWhenIndexing(): boolean {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<boolean>("prebuild_swift_when_indexing") ?? true
        );
    },
    get autoGenerateLaunchJson(): boolean {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<boolean>("auto_generate_launch_json") ?? true
        );
    },
    get checkDuplicateCompileCommands(): boolean {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<boolean>("check_duplicate_compile_commands") ?? true
        );
    },
    get preLaunchTaskName(): string {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<string>("pre_launch_task_name") ?? "bis.build: build"
        );
    },
    get buildOptions(): string {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<string>("build_options") ?? ""
        );
    },
    get compileCommandsRollingSize(): number {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<number>("compile_commands_rolling_size") ?? 300000000
        );
    },
};

export default configuration;
