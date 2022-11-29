import exp = require("constants");
import * as vscode from "vscode";

const configuration = {
    get compilationMode(): string | undefined {
        return vscode.workspace.getConfiguration("bis").get<string>("compilation_mode");
    },
    get target(): string | undefined {
        return vscode.workspace.getConfiguration("bis").get<string>("target");
    }
};

export default configuration;