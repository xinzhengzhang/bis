import * as vscode from "vscode";
import { Subject, filter  } from "rxjs";

export function activate(context: vscode.ExtensionContext) {
    const buildWatcher = vscode.workspace.createFileSystemWatcher(
        "**/{BUILD,BUILD.bazel}",
        false,
        false,
        false,
      );
      buildWatcher.onDidChange(
        buildFileChangedSubject.next,
        buildFileChangedSubject,
        context.subscriptions,
      );

      buildWatcher.onDidCreate(
        buildFileChangedSubject.next,
        buildFileChangedSubject,
        context.subscriptions,
      );

      buildWatcher.onDidDelete(
        buildFileChangedSubject.next,
        buildFileChangedSubject,
        context.subscriptions,
      );
}

const buildFileChangedSubject = new Subject<vscode.Uri | undefined>();

export const buildFileChangedEmitter = buildFileChangedSubject.asObservable().pipe(filter((x) => x !== undefined && !x.path.includes(".bis/BUILD")));
