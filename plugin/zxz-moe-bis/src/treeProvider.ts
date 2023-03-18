import * as vscode from "vscode";
import { BuildTaskProvider } from "./buildTaskProvider";

export interface ITreeItem {
  getLabel(): string;
  getIcon(): vscode.ThemeIcon | string | undefined;
  getChildren(): Thenable<ITreeItem[]>;
  mightHaveChildren(): boolean;
  getTooltip(): string | undefined;
  getCommand(): vscode.Command | undefined;
  getContextValue(): string | undefined;
}

class TreeItem implements ITreeItem {
  task: vscode.Task;
  constructor(task: vscode.Task) {
    this.task = task;
  }

  getLabel(): string {
    return this.task.name;
  }
  getIcon(): string | vscode.ThemeIcon | undefined {
    return undefined;
  }
  getChildren(): Thenable<ITreeItem[]> {
    return Promise.resolve([]);
  }
  mightHaveChildren(): boolean {
    return false;
  }
  getTooltip(): string | undefined {
    return undefined;
  }
  getCommand(): vscode.Command | undefined {
    return {
      arguments: [this.task],
      title: this.task.name,
      command: "zxz-moe-bis.build"
    };
  }
  getContextValue(): string | undefined {
    return undefined;
  }
}

export class TreeProvider
  implements vscode.TreeDataProvider<ITreeItem> {
  public onDidChangeTreeData: vscode.Event<ITreeItem | void>;

  private onDidChangeTreeDataEmitter = new vscode.EventEmitter<
  ITreeItem | void
  >();

  private cachedTreeItems: ITreeItem[] | undefined;


  constructor(private context: vscode.ExtensionContext) {
    this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    const buildWatcher = vscode.workspace.createFileSystemWatcher(
      "**/{BUILD,BUILD.bazel}",
      false,
      false,
      false,
    );
    buildWatcher.onDidChange(
      this.onBuildFilesChanged,
      this,
      context.subscriptions,
    );
    buildWatcher.onDidCreate(
      this.onBuildFilesChanged,
      this,
      context.subscriptions,
    );
    buildWatcher.onDidDelete(
      this.onBuildFilesChanged,
      this,
      context.subscriptions,
    );

    vscode.workspace.onDidChangeWorkspaceFolders(this.refresh, this);

    this.updateWorkspaceFolderTreeItems();
  }

  public getChildren(element?: ITreeItem): Thenable<ITreeItem[]> {
    if (element) {
      return element.getChildren();
    }

    if (this.cachedTreeItems === undefined) {
      this.updateWorkspaceFolderTreeItems();
    }

    if (this.cachedTreeItems) {
      return Promise.resolve(this.cachedTreeItems);
    }
  
    return Promise.resolve([]);
  }

  public getTreeItem(element: ITreeItem): vscode.TreeItem {
    const label = element.getLabel();
    const collapsibleState = element.mightHaveChildren()
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;

    const treeItem = new vscode.TreeItem(label, collapsibleState);
    treeItem.contextValue = element.getContextValue();
    treeItem.iconPath = element.getIcon();
    treeItem.tooltip = element.getTooltip();
    treeItem.command = element.getCommand();
    return treeItem;
  }

  /** Forces a re-query and refresh of the tree's contents. */
  public refresh() {
    this.updateWorkspaceFolderTreeItems();
    // this.onDidChangeTreeDataEmitter.fire();
  }

  private onBuildFilesChanged(uri: vscode.Uri) {
    this.refresh();
  }

  /** Refresh the cached BazelWorkspaceFolderTreeItems. */
  private updateWorkspaceFolderTreeItems() {
    vscode.commands.getCommands().then( value => {
      console.log(value);
    });
    new BuildTaskProvider().provideTasks().then( tasks => {
      this.cachedTreeItems = tasks.map((task) => new TreeItem(task));
      this.onDidChangeTreeDataEmitter.fire();
    });
  }
}
