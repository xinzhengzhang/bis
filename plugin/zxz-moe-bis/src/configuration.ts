import exp = require("constants");
import * as vscode from "vscode";

const configuration = {
    get simulatorCpuString(): string | undefined {
        return vscode.workspace
            .getConfiguration("bis")
            .get<string>("simulator_cpu_string");
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
    get startupOptions(): string {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<string>("startup_options") ?? ""
        );
    },
    get compileCommandsRollingSize(): number {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<number>("compile_commands_rolling_size") ?? 300000000
        );
    },
    get queryKindFilter(): string {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<string>("query_kind_filter") ?? "(swift|objc|cc)_library"
        );
    },
    get targetQueryKindFilter(): string|undefined {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<string>("target_query_kind_filter")
        );
    },
    get autoRefreshDummyProjectForInjectionIII(): boolean {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<boolean>("auto_refresh_dummy_project_for_InjectionIII") ?? true
        );
    },
    /**
     * Gets the path to the Bazel executable specified by the workspace
     * configuration, if present.
     */
    get bazelExecutablePath(): string {
        const bazelExecutable = vscode.workspace.getConfiguration("bis").get<string>("bazel_executable") ?? '';
        if (bazelExecutable.length === 0) {
            return "bazel";
        }
        return bazelExecutable;
    }
};

export default configuration;
