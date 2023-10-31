import * as vscode from "vscode";
import configuration  from "./configuration";

let channel: vscode.OutputChannel;

const loggerPrefix = (): string => {
    return configuration.pluginMode;
};

function getFormattedTime() {
    let time = new Date();
    const year = time.getFullYear();
    const month = (time.getMonth() + 1).toString().padStart(2, '0');
    const day = time.getDate().toString().padStart(2, '0');
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

function formatSingleMessage(message: any) {
    if (typeof message === "undefined") {
        return "undefined";
    } else if (message === null) {
        return "null";
    } else if (typeof message === "object") {
        return JSON.stringify(message, undefined, 4);
    } else if (message.toString) {
        return message.toString();
    }
}

function formatMessage(severity: "ERROR" | "WARN" | "INFO", messages: any[]) {
    let message = messages.map(formatSingleMessage).join(" ");

    return `[${getFormattedTime()}] [${severity}] [${loggerPrefix()}] ${message}`;
}

export function activate() {
    channel = vscode.window.createOutputChannel("Bis");
}

export function error(...args: any[]) {
    channel.appendLine(formatMessage("ERROR", args));
}

export function warn(...args: any[]) {
    channel.appendLine(formatMessage("WARN", args));
}

export function show(preserveFocus?: boolean) {
    channel.show(preserveFocus);
}

export function log(...args: any[]) {
    channel.appendLine(formatMessage("INFO", args));
}
