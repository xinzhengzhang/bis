import { Device } from "./commonTypes";
import * as logger from "./logger";
import { _execFile, _exec } from './utils';
import * as crypto from 'crypto';
import { readFile } from 'fs/promises';

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

  return p
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
  const randm_value = crypto.randomUUID()
  const outputFile = `/tmp/list_devices_${randm_value}.json`
  const logFile = `/tmp/list_devices_log_${randm_value}.json`
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
    )

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
    console.error('执行命令或解析 JSON 文件时出错:', error);
    return [];
  }
}

export async function appPath(udid: string, bundleID: string): Promise<string> {
  const randm_value = crypto.randomUUID()
  const outputFile = `/tmp/app_path_${randm_value}.json`
  const logFile = `/tmp/app_path_log_${randm_value}.json`
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
    )

    // 读取生成的 JSON 文件
    const jsonData = await readFile(outputFile, 'utf-8');

    // 解析 JSON 数据为 Device 数组
    const apps = JSON.parse(jsonData)
      .result
      .apps

    if (apps.length > 0) {
      return convertFileURL(apps[0].url);
    } else {
      return "";
    }
  } catch (error) {
    console.error('执行命令或解析 JSON 文件时出错:', error);
    return "";
  }
}

export async function deviceInstall(udid: string, path: string, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void) {
  const randm_value = crypto.randomUUID()
  const outputFile = `/tmp/device_install_${randm_value}.json`
  const logFile = `/tmp/device_install_log_${randm_value}.json`

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
    )

    progressCallback && progressCallback({
      "Status": "Completed",
      "PercentComplete": 100
    });

    // 读取生成的 JSON 文件
    const jsonData = await readFile(outputFile, 'utf-8');

    // 解析 JSON 数据为 Device 数组
    const apps = JSON.parse(jsonData)
      .result
      .installedApplications

    if (apps.length > 0) {
      return convertFileURL(apps[0].installationURL);
    } else {
      return "";
    }
  } catch (error) {
    console.error('执行命令或解析 JSON 文件时出错:', error);
    return "";
  }
}

// const udid = "00008030-000E74543608802E";
// const bundleID = "com.puergozi.bilianime";
// const path = "/Users/puer/Developer/bilibili/loktar/bazel-out/applebin_ios-ios_arm64-dbg-ST-2954a897fcf1/bin/bili-universal/bili-universal_archive-root/Payload/bili-universal.app";

// (async () => {
//   try {
//     // const output = await listDevices();
//     // const output = await appPath("00008030-000E74543608802E", "com.puergozi.bilianime");
//     const output = await deviceInstall(udid, path, bundleID,
//       { cancel: () => {} },
//       (event) => {
//         console.log(event);
//       }
//     );
//     console.log(output);
//     // 对获取到的设备数组进行进一步处理
//   } catch (error) {
//     console.error('获取设备列表时出错:', error);
//   }
// })();
