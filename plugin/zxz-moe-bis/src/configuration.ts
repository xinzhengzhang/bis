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
    get targetQueryKindFilter(): string | undefined {
        return vscode.workspace
            .getConfiguration("bis")
            .get<string>("target_query_kind_filter");
    },
    get autoRefreshDummyProjectForInjectionIII(): boolean {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<boolean>("auto_refresh_dummy_project_for_InjectionIII") ??
            true
        );
    },
    get autoRefreshTreeViewerWhenConfigurationChanged(): boolean {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<boolean>("auto_refresh_tree_viewer_configuration_changed") ?? false
        );
    },
    /**
     * Gets the path to the Bazel executable specified by the workspace
     * configuration, if present.
     */
    get bazelExecutablePath(): string {
        const bazelExecutable =
            vscode.workspace
                .getConfiguration("bis")
                .get<string>("bazel_executable") ?? "";
        if (bazelExecutable.length === 0) {
            return "bazel";
        }
        return bazelExecutable;
    },
    get pluginMode(): string {
        return (
            vscode.workspace
                .getConfiguration("bis")
                .get<string>("plugin_mode") ?? "mixed"
        );
    },
    get isWifiDeviceIncluded(): boolean {
        return (
            vscode.workspace
                .getConfiguration("ios-deploy")
                .get<boolean>("wifi_device_enabled") ?? true
        );
    },
    get isIncrementalInstallEnabled(): boolean {
        return (
            vscode.workspace
                .getConfiguration("ios-deploy")
                .get<boolean>("incremental_installation_enabled") ?? true
        );
    },
    get debugServerLocalPort(): number {
        return (
            vscode.workspace
                .getConfiguration("pymobiledevice3")
                .get<number>("debugserver_local_port") ?? 51968
        );
    }
};

export default configuration;
