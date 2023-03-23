import * as vscode from "vscode";
import { BuildTaskProvider } from "./buildTaskProvider";
import { targetVariable, deviceVariable } from "./variables";

export interface ITreeItem {
    getLabel(): string;
    getIcon(): vscode.ThemeIcon | string | undefined;
    getChildren(): Thenable<ITreeItem[]>;
    collapsibleState(): vscode.TreeItemCollapsibleState;
    getTooltip(): string | undefined;
    getCommand(): vscode.Command | undefined;
    getContextValue(): string | undefined;
}

class TreeItem implements ITreeItem {
    task: vscode.Task | undefined;
    path: string;
    label: string;
    icon: vscode.ThemeIcon;
    children: TreeItem[] = [];

    constructor(task: vscode.Task | undefined, path: string) {
        this.task = task;
        this.path = path;
        this.label = path.split("/").pop() ?? path;
        if (task) {
            if (path.startsWith("all index dependents ")) {
                this.path = path.replace(/^all index dependents /, "");
                this.icon = new vscode.ThemeIcon("wrench");
            } else if (path.startsWith("artifacts ")) {
                this.path = path.replace(/^artifacts /, "");
                this.icon = new vscode.ThemeIcon("debug-start");
            } else {
                this.icon = new vscode.ThemeIcon("debug-start");
            }
        } else {
           this.icon = vscode.ThemeIcon.Folder;
        }
    }

    public insertItem(item: TreeItem) {
        let node: TreeItem = this;
        for (const child of this.children) {
            if (item.path.startsWith(child.path)) {
                node = child;
                break;
            }
        }

        const index = item.path.indexOf(node.path);
        if (index > -1) {
            const components = item.path
                .substring(index + node.path.length)
                .split("/");
            let path = node.path;
            for (const idx in components) {
                let component = components[idx];
                if (+idx === components.length - 1) {
                    component = component.replace(/:.*$/, "");
                }
                if (component === "") {
                    continue;
                }
                path += `${path === "" ? "" : "/"}${component}`;
                const candidate = node.children
                    .concat(node)
                    .filter((child) => child.path === path);
                if (candidate.length > 0) {
                    node = candidate[0];
                } else {
                    const newItem = new TreeItem(undefined, path);
                    node.children.push(newItem);
                    node = newItem;
                }
            }
            node.children.push(item);
        } else {
            console.log("error");
            return;
        }
    }

    getLabel(): string {
        if (this.task) {
            return this.task.name;
        } else {
            return this.label;
        }
    }
    getIcon(): string | vscode.ThemeIcon | undefined {
        return this.icon;
    }
    getChildren(): Thenable<ITreeItem[]> {
        return Promise.resolve(this.children);
    }

    collapsibleState(): vscode.TreeItemCollapsibleState {
        if (this.children.length === 0) {
            return vscode.TreeItemCollapsibleState.None;
        } else {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
    }
    getTooltip(): string | undefined {
        return undefined;
    }
    getCommand(): vscode.Command | undefined {
        return {
            arguments: [this.task],
            title: this.task?.name ?? "",
            command: "zxz-moe-bis.build",
        };
    }
    getContextValue(): string | undefined {
        return undefined;
    }
}

export class TreeProvider implements vscode.TreeDataProvider<ITreeItem> {
    public onDidChangeTreeData: vscode.Event<ITreeItem | void>;

    private onDidChangeTreeDataEmitter =
        new vscode.EventEmitter<ITreeItem | void>();
    private isPending = false;
    private isProcessing = false;

    private cachedTreeItems: ITreeItem[] | undefined;

    constructor(private context: vscode.ExtensionContext) {
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

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
        const collapsibleState = element.collapsibleState();
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
    }

    private onBuildFilesChanged(uri: vscode.Uri) {
        this.refresh();
    }

    /** Refresh the cached BazelWorkspaceFolderTreeItems. */
    private updateWorkspaceFolderTreeItems() {
        if (!targetVariable.get() || !deviceVariable.get()) {
            // no target specified
            return;
        }
        if (this.isProcessing) {
            this.isPending = true;
            return;
        }
        const run = () => {
            this.isProcessing = true;
            new BuildTaskProvider().provideTasks().then((tasks) => {
                const items = tasks.map(
                    (task) =>
                    new TreeItem(task, task.name.replace(/^build /, ""))
                );
                const root = new TreeItem(undefined, "");
                for (const item of items) {
                    root.insertItem(item);
                }
                this.cachedTreeItems = root.children;
                this.onDidChangeTreeDataEmitter.fire();
                if (this.isPending) {
                    this.isPending = false;
                    run();
                }
                this.isProcessing = false;
            });
        };
        run();
    }
}
