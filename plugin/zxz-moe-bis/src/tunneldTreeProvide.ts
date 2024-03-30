import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as pymobiledevice3 from './pymobiledevice3';
import { Device } from './commonTypes';
import { DaemonServer } from './daemonServer';
import { log } from './logger';

export enum CommandName {
  launchDaemonServer = 'zxz-moe-bis.launchDaemonServer',
  stopDaemonServer = 'zxz-moe-bis.stopDaemonServer',
}

export interface Expandable {
  getChildren(): Promise<vscode.TreeItem[] | undefined>;
}

function isExpandable(item: any): item is Expandable {
  return 'getChildren' in item;
}

export class StartServerItem extends vscode.TreeItem {
  constructor() {
    super('Started');
    this.description = 'Start daemon server';
    this.iconPath = new vscode.ThemeIcon('debug-start');
    this.command = {
      title: 'Start daemon server',
      command: CommandName.launchDaemonServer,
    };
  }
}

export class StopServerItem extends vscode.TreeItem {
  constructor() {
    super('Stop');
    this.description = 'Stop daemon server';
    this.iconPath = new vscode.ThemeIcon('debug-stop');
    this.command = {
      title: 'Stop daemon server',
      command: CommandName.stopDaemonServer,
    };
  }
}

export class OpenInBrowserItem extends vscode.TreeItem {
  constructor() {
    super('Open daemon server');
    this.iconPath = new vscode.ThemeIcon('globe');
    this.command = {
      title: 'Open in browser',
      command: 'vscode.open',
      arguments: [vscode.Uri.parse('http://127.0.0.1:49151')],
    };
  }
}

export class ConnectedDevicesItem extends vscode.TreeItem implements Expandable {
  constructor(
    name: string,
    private udid: string,
    private host: string,
    private port: number
  ) {
    super(name);
    this.iconPath = new vscode.ThemeIcon('device-mobile');
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const udidItem = new vscode.TreeItem("UDID: ");
    udidItem.description = this.udid;

    const hostItem = new vscode.TreeItem("Rsd-Host: ");
    hostItem.description = this.host;

    const portItem = new vscode.TreeItem("Rsd-Port: ");
    portItem.description = this.port.toString();

    return [
      udidItem,
      hostItem,
      portItem
    ];
  }
}

export class ConnectedDevicesOutlineItem extends vscode.TreeItem implements Expandable {
  constructor(
    private devices: ConnectedDevicesItem[]
  ) {
    super('Connected Devices');
    this.iconPath = new vscode.ThemeIcon('symbol-event');
    this.collapsibleState = devices.length === 0 ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded;
    this.contextValue = "connectedDevicesOutline";
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    return this.devices;
  }
}

class DaemonServerItem
  extends vscode.TreeItem
  implements vscode.Disposable, Expandable {
  public daemonServer: DaemonServer;
  constructor(
    // onDidChangeTreeData: (item: vscode.TreeItem) => void
  ) {
    super('Bis Daemon Server', vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "DaemonServerItem";
    this.daemonServer = new DaemonServer(
      "127.0.0.1",
      49151
    );
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const items: vscode.TreeItem[] = [];
    const isOn = await this.daemonServer.isServerAvailable();
    if (isOn) {
      const result = await this.daemonServer.checkServer();
      const devices = await pymobiledevice3.listDevices();
      const connnectDevices: ConnectedDevicesItem[] = [];

      for (const [key, [host, port]] of Object.entries(result)) {
        connnectDevices.push(
          new ConnectedDevicesItem(
            devices.filter((device) => device.udid === key)[0].name,
            key,
            host,
            port
          )
        );
      }
      if (connnectDevices.length > 0) {
        items.push(
          new ConnectedDevicesOutlineItem(connnectDevices)
        );
      }
      items.push(new OpenInBrowserItem());
      items.push(new StopServerItem());
    } else {
      items.push(new StartServerItem());
    }

    return items;
  }

  dispose() {
    this.daemonServer.shutdown();
  }
}

export class DaemonServerTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  public onDidChangeTreeData: vscode.Event<vscode.TreeItem | void>;

  private daemonServerItem: DaemonServerItem;

  private onDidChangeTreeDataEmitter =
    new vscode.EventEmitter<vscode.TreeItem | void>();

  constructor(private context: vscode.ExtensionContext) {
    this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    this.daemonServerItem = new DaemonServerItem();
    context.subscriptions.push(this.daemonServerItem);
  }

  public async getChildren(element?: vscode.TreeItem | undefined): Promise<vscode.TreeItem[] | undefined> {
    if (!element) {
      return this.getRootItems();
    }
    if (isExpandable(element)) {
      return element.getChildren();
    }

    return undefined;
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  protected async getRootItems(): Promise<vscode.TreeItem[]> {
    const items: vscode.TreeItem[] = [
      this.daemonServerItem
    ];
    return items;
  }

  public refreshDevices() {
    this.onDidChangeTreeDataEmitter.fire();
  }

  public async startDaemonServer() {
    const userInput = await vscode.window.showInputBox(
      {
        title: "Input your password",
        prompt: "This command requires root privileges.",
        password: true,
        ignoreFocusOut: true
      }
    );
    let tunnelInfo = await pymobiledevice3.statrTunnel(userInput || "");
    log("tunnelInfo", tunnelInfo);
    this.onDidChangeTreeDataEmitter.fire();
  }
  public async stopDaemonServer() {
    this.daemonServerItem.daemonServer.shutdown();
    this.onDidChangeTreeDataEmitter.fire();
  }
}
