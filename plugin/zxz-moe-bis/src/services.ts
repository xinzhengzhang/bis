/* eslint-disable @typescript-eslint/naming-convention */
/**
 * 封装一些常用的工具函数
 */
import * as vscode from "vscode";

export class Service {
    static instance: Service;
    static context: vscode.ExtensionContext;
    static viewId: string;
    static disposes: { dispose(): any }[] = [];
    static setup(context: vscode.ExtensionContext) {
        this.instance = new this(context);
        this.context = context;
        this.disposes.forEach((e) => this.context.subscriptions.push(e));
    }
    protected constructor(context: vscode.ExtensionContext) {}

    protected setContext(key: string, value: any) {
        vscode.commands.executeCommand("setContext", key, value);
    }
    protected getContext(key: string) {
        return vscode.commands.executeCommand("getContext", key);
    }
}

/**
 * register a commnad bind a target functions
 * like @Command("xxx.action")
 * @param cmd the command
 * @param useContext make command in context
 * @returns
 */
export function Command(opt: { cmd: string; useContext?: boolean }): any {
    return function (
        target: any,
        methodName: string,
        descriptor: PropertyDescriptor
    ) {
        const originMethod = descriptor.value;
        const dis = vscode.commands.registerCommand(opt.cmd, (...args: any) => {
            return originMethod.call(target.constructor.instance, args);
        });
        console.log("cmd", opt);
        if (opt.useContext) {
            target.constructor.disposes.push(dis);
        }
        return descriptor;
    };
}

export type IRunLoading = vscode.ProgressOptions;

export function RunLoading(opt?: IRunLoading): any {
    return function (
        target: any,
        methodName: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any) {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Runing...",
                    ...(opt ?? {}),
                },
                (progress, token) => {
                    return originalMethod.call(this, ...args);
                }
            );
        };
        return descriptor;
    };
}
