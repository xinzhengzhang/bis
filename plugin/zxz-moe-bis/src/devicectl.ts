import { createWriteStream, openSync } from "fs";
import { Device } from "./commonTypes";
import * as logger from "./logger";
import { _execFile, _exec } from './utils';
import * as crypto from 'crypto';
import { readFile } from 'fs/promises';
import * as vscode from "vscode";
import { spawn } from "child_process";

interface RunningProcesses {
  processIdentifier: number;
  executable: string;
}

async function executeDevicectl(
  args: string[],
  output: string,
  log: string,
  cancellationToken: { cancel(): void },
  customEnv?: { [key: string]: string } | null
) {
  const command = ["xcrun", "devicectl"].concat(args).concat(["-j", output, "-l", log]);
  logger.log("execute: ", command.join(" "));
  let p = _exec(command.join(" "), {
    env: {
      ...process.env,
      ...customEnv,
    },
  });

  cancellationToken.cancel = () => p.child.kill();

  return p;
}

function convertFileURL(fileURL: string): string {
  // 检查文件路径是否以 "file://" 开头
  if (fileURL.startsWith('file://')) {
    // 去掉 "file://" 前缀
    fileURL = fileURL.slice(7);
  }

  // 去掉末尾的斜杠
  if (fileURL.endsWith('/')) {
    fileURL = fileURL.slice(0, -1);
  }

  return fileURL;
}

export async function listDevices(): Promise<Device[]> {
  const randomValue = crypto.randomUUID();
  const outputFile = `/tmp/list_devices_${randomValue}.json`;
  const logFile = `/tmp/list_devices_log_${randomValue}.json`;
  try {
    logger.log("List Devices");
    logger.log("outputFile: ", outputFile);
    logger.log("logFile: ", logFile);
    // 执行命令
    await executeDevicectl(
      ["list", "devices"],
      outputFile,
      logFile,
      { cancel: () => { } }
    );

    // 读取生成的 JSON 文件
    const jsonData = await readFile(outputFile, 'utf-8');

    // 解析 JSON 数据为 Device 数组
    const devices: Device[] = JSON.parse(jsonData)
      .result
      .devices
      .map((d: any): Device => ({
        udid: d.hardwareProperties.udid,
        name: `${d.deviceProperties.name}`,
        type: "Device",
        version: d.deviceProperties.osVersionNumber,
        buildVersion: d.deviceProperties.osBuildUpdate,
        runtime: `iOS ${d.deviceProperties.osVersionNumber}`,
        sdk: "iphoneos",
        modelName: d.hardwareProperties.marketingName,
      }));;

    return devices;
  } catch (error) {
    const err = error as Error;
    vscode.window.showErrorMessage(`发生错误：${err.message}`);
    logger.error('执行命令或解析 JSON 文件时出错:', error);
    return [];
  }
}

export async function appPath(udid: string, bundleID: string): Promise<string> {
  const randomValue = crypto.randomUUID();
  const outputFile = `/tmp/app_path_${randomValue}.json`;
  const logFile = `/tmp/app_path_log_${randomValue}.json`;
  try {
    logger.log("App Path");
    logger.log("outputFile: ", outputFile);
    logger.log("logFile: ", logFile);
    // 执行命令
    await executeDevicectl(
      ["device", "info", "apps", "-d", udid, "--bundle-id", bundleID],
      outputFile,
      logFile,
      { cancel: () => { } }
    );

    // 读取生成的 JSON 文件
    const jsonData = await readFile(outputFile, 'utf-8');

    // 解析 JSON 数据为 Device 数组
    const apps = JSON.parse(jsonData)
      .result
      .apps;

    if (apps.length > 0) {
      return convertFileURL(apps[0].url);
    } else {
      return "";
    }
  } catch (error) {
    const err = error as Error;
    vscode.window.showErrorMessage(`发生错误：${err.message}`);
    logger.error('执行命令或解析 JSON 文件时出错:', error);
    return "";
  }
}

export async function deviceInstall(udid: string, path: string, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void) {
  const randomValue = crypto.randomUUID();
  const outputFile = `/tmp/device_install_${randomValue}.json`;
  const logFile = `/tmp/device_install_log_${randomValue}.json`;

  try {
    logger.log("Install application");
    logger.log("outputFile: ", outputFile);
    logger.log("logFile: ", logFile);

    progressCallback && progressCallback({
      "Status": "Installing",
      "PercentComplete": 0
    });
    // 执行命令
    await executeDevicectl(
      ["device", "install", "app", "-d", udid, path],
      outputFile,
      logFile,
      { cancel: () => { } }
    );

    progressCallback && progressCallback({
      "Status": "Completed",
      "PercentComplete": 100
    });

    // 读取生成的 JSON 文件
    const jsonData = await readFile(outputFile, 'utf-8');

    // 解析 JSON 数据为 Device 数组
    const apps = JSON.parse(jsonData)
      .result
      .installedApplications;

    if (apps.length > 0) {
      return convertFileURL(apps[0].installationURL);
    } else {
      return "";
    }
  } catch (error) {
    const err = error as Error;
    vscode.window.showErrorMessage(`发生错误：${err.message}`);
    logger.error('执行命令或解析 JSON 文件时出错:', error);
    return "";
  }
}

export async function getPidFor(udid: string, appPath: string): Promise<Number|undefined> {
  const randomValue = crypto.randomUUID();
  const outputFile = `/tmp/app_path_${randomValue}.json`;
  const logFile = `/tmp/app_path_log_${randomValue}.json`;
  
  await executeDevicectl(
    ["device", "info", "processes", "-d", udid],
    outputFile,
    logFile,
    { cancel: () => { } }
  );
  
  // 读取生成的 JSON 文件
  const jsonData = await readFile(outputFile, 'utf-8');

  // 解析 JSON 数据为 Device 数组
  const runningProcesses = JSON.parse(jsonData)
    .result
    .runningProcesses as RunningProcesses[];
  const process = runningProcesses
      .find(item => item.executable?.includes(appPath));
  if (process) {
    return process.processIdentifier;
  } else {
    return undefined;
  }
}

export async function launchProcess(udid: string, bundleID: string, preferredLogPath: string): Promise<Number|undefined> {
  const randomValue = crypto.randomUUID();
  const outputFile = `/tmp/app_path_${randomValue}.json`;
  const logFile = `/tmp/app_path_log_${randomValue}.json`;
  
  const commandWithConsole = ["device", "process", "launch", "--console", "-d", udid, "--start-stopped", bundleID];
  const commandWithoutConsole = ["device", "process", "launch", "-d", udid, "--start-stopped", bundleID];
  const processLogStream = createWriteStream(preferredLogPath, { flags: "a" });

  
  // Attempt to launch with --console mode
  try {
    const consoleModeSuccess = await new Promise<boolean>((resolve, reject) => {
      logger.log(`Try Process launching --console mode with command: xcrun devicectl ${commandWithConsole.join(" ")}`);
      const targetLaunchProcess = spawn("xcrun", ["devicectl", ...commandWithConsole], { detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: {
        ...process.env,
        "DEVICECTL_CHILD_OS_ACTIVITY_DT_MODE": "enable"

      } });
      const timeout = setTimeout(() => {
        targetLaunchProcess.kill();
        reject(new Error("Command execution timed out after 10 seconds"));
      }, 10000);

      targetLaunchProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes("Waiting for")) {
          logger.log("Process launched successfully waiting for the process attached");
          clearTimeout(timeout);
          resolve(true);
        }
      });
      targetLaunchProcess.stderr?.pipe(processLogStream);

      targetLaunchProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      targetLaunchProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });

    if (consoleModeSuccess) {
      logger.log("Process launched successfully in --console mode.");
      return undefined;
    }
  } catch (error) {
    logger.warn("Failed to launch process in --console mode, falling back to non-console mode." + JSON.stringify(error));
  }
  
  await executeDevicectl(
    commandWithoutConsole,
    outputFile,
    logFile,
    { cancel: () => { } },
    {
      "DEVICECTL_CHILD_OS_ACTIVITY_DT_MODE": "enable"
    }
  );
  
  // 读取生成的 JSON 文件
  const jsonData = await readFile(outputFile, 'utf-8');

  // 解析 JSON 数据为 Device 数组
  const pid = JSON.parse(jsonData)
    .result
    .process
    .processIdentifier;
    
  return pid;
}
