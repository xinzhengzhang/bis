import { Device } from "./commonTypes";
import * as logger from "./logger";
import { _execFile, _exec } from './utils';
import * as crypto from 'crypto';
import { readFile } from 'fs/promises';

interface RunningProcesses {
  processIdentifier: number;
  executable: string;
}

async function execute_devicectl(
  args: string[],
  output: string,
  log: string,
  cancellationToken: { cancel(): void },
) {
  const command = ["xcrun", "devicectl"].concat(args).concat(["-j", output, "-l", log]);
  logger.log("execute: ", command.join(" "));
  let p = _exec(command.join(" "));

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
  const randm_value = crypto.randomUUID();
  const outputFile = `/tmp/list_devices_${randm_value}.json`;
  const logFile = `/tmp/list_devices_log_${randm_value}.json`;
  try {
    logger.log("List Devices");
    logger.log("outputFile: ", outputFile);
    logger.log("logFile: ", logFile);
    // 执行命令
    await execute_devicectl(
      ["list", "devices", "--filter 'State == \"connected\"'"],
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
        name: d.deviceProperties.name,
        type: "Device",
        version: d.deviceProperties.osVersionNumber,
        buildVersion: d.deviceProperties.osBuildUpdate,
        runtime: `iOS ${d.deviceProperties.osVersionNumber}`,
        sdk: "iphoneos",
        modelName: d.hardwareProperties.marketingName,
      }));;

    return devices;
  } catch (error) {
    logger.error('执行命令或解析 JSON 文件时出错:', error);
    return [];
  }
}

export async function appPath(udid: string, bundleID: string): Promise<string> {
  const randm_value = crypto.randomUUID();
  const outputFile = `/tmp/app_path_${randm_value}.json`;
  const logFile = `/tmp/app_path_log_${randm_value}.json`;
  try {
    logger.log("App Path");
    logger.log("outputFile: ", outputFile);
    logger.log("logFile: ", logFile);
    // 执行命令
    await execute_devicectl(
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
    logger.error('执行命令或解析 JSON 文件时出错:', error);
    return "";
  }
}

export async function deviceInstall(udid: string, path: string, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void) {
  const randm_value = crypto.randomUUID();
  const outputFile = `/tmp/device_install_${randm_value}.json`;
  const logFile = `/tmp/device_install_log_${randm_value}.json`;

  try {
    logger.log("Install application");
    logger.log("outputFile: ", outputFile);
    logger.log("logFile: ", logFile);

    progressCallback && progressCallback({
      "Status": "Installing",
      "PercentComplete": 0
    });
    // 执行命令
    await execute_devicectl(
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
    logger.error('执行命令或解析 JSON 文件时出错:', error);
    return "";
  }
}

export async function getPidFor(udid: string, appPath: string): Promise<Number> {
  const randm_value = crypto.randomUUID();
  const outputFile = `/tmp/app_path_${randm_value}.json`;
  const logFile = `/tmp/app_path_log_${randm_value}.json`;
  
  await execute_devicectl(
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
    return 1;
  }
}

export async function launchProccess(udid: string, bundleID: string): Promise<Number> {
  const randm_value = crypto.randomUUID();
  const outputFile = `/tmp/app_path_${randm_value}.json`;
  const logFile = `/tmp/app_path_log_${randm_value}.json`;
  
  await execute_devicectl(
    ["device", "process", "launch", "-d", udid, "--start-stopped", bundleID],
    outputFile,
    logFile,
    { cancel: () => { } }
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
