import * as vscode from "vscode";
import { BehaviorSubject } from "rxjs";

class Variable<T> {
    private context: vscode.ExtensionContext|undefined;
    private key: string;
    subject: BehaviorSubject<T|undefined> = new BehaviorSubject<T|undefined>(undefined);

    constructor(key: string) {
        this.key = key;
    }

    active(context: vscode.ExtensionContext) {
        this.context = context;
        this.subject.next(context.workspaceState.get(this.key));
    }

    update(value: T) {
        this.context?.workspaceState.update(this.key, value);
        this.subject.next(value);
    }

    get(): T|undefined {
        return this.subject.value;
    }
}

const INPUTED_LABEL_STRING = "inputed_label_string";
const SELECTED_COMPILATION_MODE_KEY = "selected_compilation_mode";
const CPU_VARIABLE_KEY = "cpu_variable_key";

export enum CompilationMode {
    dbg = "dbg",
    opt = "opt",
}

export const targetVariable = new Variable<string>(INPUTED_LABEL_STRING);
export const compilationModeVariable= new Variable<CompilationMode>(SELECTED_COMPILATION_MODE_KEY);
export const cpuVariable = new Variable<string>(CPU_VARIABLE_KEY);
