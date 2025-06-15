import * as vscode from "vscode";
import { promisify } from "util";
import { executeBazelCommands, isBisWorkspace } from "./utils";
import * as logger from "./logger";

export function touchBisBuild() {
    // Touch .bis/BUILD
    const task = new vscode.Task(
        { type: "bis.build" },
        vscode.TaskScope.Workspace,
        "touch_bis_build",
        "bis.build",
        new vscode.ShellExecution("mkdir -p .bis && touch .bis/BUILD")
    );
    task.presentationOptions.focus = false;
    vscode.tasks.executeTask(task);
}

export function isBisInstalled(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (isBisWorkspace()) {
            resolve(undefined);
        }
        vscode.commands
            .executeCommand<string | undefined>("zxz-moe-bis.workspace", true)
            .then((workspaceRoot) => {
                promisify(executeBazelCommands)(
                    "query",
                    ["@bis//:setup"],
                    [],
                    workspaceRoot
                )
                    .then((stdout) => {
                        const splited = stdout.split(/\r?\n/);
                        const containsBis = splited.some((item) => {
                            return item.startsWith("@bis//");
                        });
                        if (containsBis) {
                            resolve(undefined);
                        } else {
                            reject(new Error("no @bis found"));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
    });
}

export function queryLocationOfBUILD(targetPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        vscode.commands
            .executeCommand<string | undefined>("zxz-moe-bis.workspace", true)
            .then((workspaceRoot) => {
                promisify(executeBazelCommands)(
                    "query",
                    [targetPath, "--output=location"],
                    [],
                    workspaceRoot
                )
                    .then((stdout) => {
                        const r = RegExp(/(.*\/BUILD(?:\.bazel)?\:\d+\:\d+)\:\s+.*rule.*/);
                        if (r.test(stdout)) {
                            resolve(stdout.match(r)![1]);
                        } else {
                            logger.error("Unexpect output: ", stdout);
                            reject(new Error("no BUILD file found"));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
    });
}