import * as vscode from "vscode";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { Target, Device } from "vscode-ios-debug/src/commonTypes";
import * as os from "node:os";

class Variable<T> {
    private context: vscode.ExtensionContext | undefined;
    private key: string;
    private subject?: BehaviorSubject<T | undefined>;

    constructor(key: string) {
        this.key = key;
    }

    active(context: vscode.ExtensionContext) {
        this.context = context;
        this.subject = new BehaviorSubject<T | undefined>(context.workspaceState.get(this.key));
    }

    update(value: T | undefined) {
        if (this.subject?.value !== value) {
            this.context?.workspaceState.update(this.key, value);
            this.subject!.next(value);
        }
    }

    check() {
        if (!this.subject || !this.context) {
            throw new Error("This variable `active(context)` has not been called!");
        }
    }
    get(): T | undefined {
        return this.subject?.value;
    }
    asObservable(): Observable<T | undefined > {
        this.check();
        return this.subject!;
    }

    subscribe(next: (value: T | undefined) => void) {
        this.check();
        const sub = this.subject!.subscribe(next);
        this.context!.subscriptions.push({ dispose: sub.unsubscribe });
    }
}

const INPUTED_LABEL_STRING = "inputed_label_string";
const SELECTED_COMPILATION_MODE_KEY = "selected_compilation_mode";
const CPU_VARIABLE_KEY = "cpu_variable_key";

const DEVICE_VARIABLE_KEY = "selected_target"; // override key in ios-debug

export enum CompilationMode {
    dbg = "dbg",
    opt = "opt",
}

export const targetVariable = new Variable<string>(INPUTED_LABEL_STRING);
export const compilationModeVariable = new Variable<CompilationMode>(SELECTED_COMPILATION_MODE_KEY);
export const cpuVariable = new Variable<string>(CPU_VARIABLE_KEY);
export const deviceVariable = new Variable<Target>(DEVICE_VARIABLE_KEY);
