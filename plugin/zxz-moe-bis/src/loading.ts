/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';

export type IRunLoading = vscode.ProgressOptions;

export function RunLoading(opt?: IRunLoading): any {
    return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                ...(opt ?? {})
            }, (progress, token) => {
                return originalMethod.call(this, ...args);
            });
        };
        return descriptor;
    };
}