import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';
import { Device } from "./commonTypes";
import { _execFile } from './utils';
import configuration from './configuration';
import * as vscode from "vscode";
import * as StreamValues from 'stream-json/streamers/StreamValues';
import { PromiseWithChild } from 'child_process';

let IOS_DEPLOY = "ios-deploy";

{
  const iosDeployPackagePath = require.resolve('ios-deploy/package.json');
  const binRelativePath = require(iosDeployPackagePath).bin['ios-deploy'] || 'build/Release/ios-deploy';
  const iosDeployPath = path.join(path.dirname(iosDeployPackagePath), binRelativePath);

  if (fs.existsSync(iosDeployPath)) {
    IOS_DEPLOY = iosDeployPath;
  }
}

async function install(udid: string, path: string, cancellationToken: { cancel?(): void }, progressCallback?: (event: any) => void): Promise<string> {
  let time = new Date().getTime();

  let installationPath: string | undefined = undefined;
  let command = IOS_DEPLOY;
  let args = ['--id', udid, '--faster-path-search', '--timeout', '3', '--bundle', path, '--json'].concat(configuration.isIncrementalInstallEnabled ? ['--app_deltas', '/tmp/'] : []);

  logger.log(`Running ${command} ${args.join(' ')}`);
  let p = _execFile(command, args);

  cancellationToken.cancel = () => p.child.kill();

  p.child.stdout?.pipe(StreamValues.withParser())
    .on('data', (data) => {
      let event = data.value;

      if (event.Event === "BundleInstall" && event.Status === "Complete") {
        installationPath = event.Path;
      }

      progressCallback && progressCallback(event);
    });

  await p;

  logger.log(`Installed in ${new Date().getTime() - time} ms`);
  logger.log(`Path: ${installationPath}`);

  if (!installationPath) {
    throw Error('Could not install and get path');
  }

  return installationPath;
}

export async function getAppDevicePath(udid: string, appBundleId: string) {
  logger.log(`Getting path for app (bundle id: ${appBundleId}) on device (udid: ${udid})`);
  let time = new Date().getTime();

  let p = _execFile(IOS_DEPLOY, ['--id', udid, '--list_bundle_id', '--json', '-k', 'Path']);

  let appDevicePath: string | undefined = await new Promise((resolve, reject) => {
    p.catch(reject);

    let eventFound = false;
    p.child.stdout?.pipe(StreamValues.withParser())
      .on('data', (data) => {
        let event = data.value;

        if (event.Event === "ListBundleId") {
          eventFound = true;

          // eslint-disable-next-line @typescript-eslint/naming-convention
          let apps: { [appBundleId: string]: { "CFBundleIdentifier": string, "Path": string } } = event.Apps;
          resolve(appBundleId in apps ? apps[appBundleId]?.Path : undefined);
        }
      })
      .on("end", () => {
        if (!eventFound) {
          resolve(undefined);
        }
      });
  });

  await p;

  logger.log(`App device path (${appDevicePath}) retrieved in ${new Date().getTime() - time} ms`);

  return appDevicePath;
}

export async function listDevices(): Promise<Device[]> {
  logger.log(`Listing devices using ${IOS_DEPLOY}`);

  return _execFile(IOS_DEPLOY, ['--detect', configuration.isWifiDeviceIncluded ? '' : '--no-wifi', '--timeout', '1', '--json'])
    .then(({ stdout, stderr }): Device[] => {
      if (stderr) { logger.error(stderr); }

      stdout = `[${stdout.replace(/\n\}\{\n/g, '\n},{\n')}]`;

      let devices: Device[] = JSON.parse(stdout) || {};

      devices = devices
        .filter((d: any) => d.Event === 'DeviceDetected')
        .map((d: any) => d.Device)
        .map((d: any): Device => ({
          udid: d.DeviceIdentifier as string,
          name: d.DeviceName,
          type: "Device",
          version: d.ProductVersion,
          buildVersion: d.BuildVersion,
          runtime: `iOS ${d.ProductVersion}`,
          sdk: "iphoneos",
          modelName: d.modelName,
        }));

      logger.log(`Found ${devices.length} devices`);

      return devices;
    }).catch((e: any) => {
      logger.log(`Could not find any connected device: ${e.toString().trimEnd()}`);
      e.stderr && logger.error(e.stderr);

      return [];
    });
}

export async function deviceInstall(args: { udid: string, path: string }, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void) {
  let { udid, path } = args;

  return Promise.resolve()
    .then(() => install(udid, path, cancellationToken, (event) => {
      let message;
      if (event.Event === "BundleCopy") {
        message = "Copying " + event.Path.replace(new RegExp(`^${path}/?`), "");
      }
      else if (event.Event === "BundleInstall") {
        message = event.Status;
      }

      progressCallback && progressCallback({
        "Status": message,
        "PercentComplete": event.OverallPercent
      });
    }))
    .then((devicePath: string) => devicePath)
    .catch((e) => {
      vscode.window.showErrorMessage("Failed to install app on device");
    });
}

export async function debugserver(udid: string, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void): Promise<{ host: string, port: number, exec: PromiseWithChild<{ stdout: string, stderr: string }> }> {
  let time = new Date().getTime();

  let command = IOS_DEPLOY;
  let args = ['--id', udid, '--nolldb', '--faster-path-search', '--json'];
  logger.log(`Running ${command} ${args.join(' ')}`);

  let p = _execFile(command, args);

  cancellationToken.cancel = () => p.child.kill();

  let port: number = await new Promise((resolve, reject) => {
    p.catch(reject);

    p.child.stdout?.pipe(StreamValues.withParser())
      .on('data', (data) => {
        let event = data.value;

        if (event.Event === "DebugServerLaunched") {
          resolve(event.Port);
        }

        progressCallback && progressCallback(event);
      });
  });

  logger.log(`Debugserver started in ${new Date().getTime() - time} ms`);

  if (!port) {
    throw Error('Could not start debugserver and get port');
  }

  return {
    host: "127.0.0.1",
    port: port,
    exec: p,
  };
}