import exp = require("constants");
import * as vscode from "vscode";

const configuration = {
    get simulatorCpuString(): string | undefined {
        return vscode.workspace.getConfiguration("bis").get<string>("simulator_cpu_string");
    }
};

export default configuration;