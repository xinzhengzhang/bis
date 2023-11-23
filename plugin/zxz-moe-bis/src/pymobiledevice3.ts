
import { _execFile, _exec } from './utils';
import * as logger from "./logger";
import * as StreamValues from 'stream-json/streamers/StreamValues';
import { Device } from "./commonTypes";
import * as vscode from "vscode";
import { PromiseWithChild } from 'child_process';
import configuration from './configuration';
import { isIOS17OrLater } from './utils';
import * as path from 'path';
import * as fs from 'fs';

let PYMDWORKSPACE = "pymobiledevicelite";

export function activate(context: vscode.ExtensionContext) {
    // 获取当前扩展的路径
    let extensionPath = context.extensionPath;

    // 计算 pymobiledevicelite 完整路径
    PYMDWORKSPACE = path.join(extensionPath, 'pymobiledevicelite');
    logger.log(PYMDWORKSPACE);
}

const bazelExe = configuration.bazelExecutablePath;

const baseArgs = ['run', '--ui_event_filters=ERROR', '--noshow_progress', '//:pymobiledevicelite', '--'];

/*
{"PercentComplete": 5, "Status": "CreatingStagingDirectory"}
{"PercentComplete": 15, "Status": "ExtractingPackage"}
{"PercentComplete": 20, "Status": "InspectingPackage"}
{"PercentComplete": 20, "Status": "TakingInstallLock"}
{"PercentComplete": 30, "Status": "PreflightingApplication"}
{"PercentComplete": 30, "Status": "InstallingEmbeddedProfile"}
{"PercentComplete": 40, "Status": "VerifyingApplication"}
{"PercentComplete": 50, "Status": "CreatingContainer"}
{"PercentComplete": 60, "Status": "InstallingApplication"}
{"PercentComplete": 70, "Status": "PostflightingApplication"}
{"PercentComplete": 80, "Status": "SandboxingApplication"}
{"PercentComplete": 90, "Status": "GeneratingApplicationMap"}
{"Status": "Complete"}
*/
async function install(udid: string, path: string, bundleID: string, cancellationToken: { cancel?(): void }, progressCallback?: (event: any) => void): Promise<string | undefined> {
    let time = new Date().getTime();

    let args = baseArgs.concat(['install-app', '--udid', udid, path]);

    logger.log(`Running bazel ${args.join(' ')}`);

    let p = _execFile(
        bazelExe,
        args,
        { shell: true, cwd: PYMDWORKSPACE }
    );

    cancellationToken.cancel = () => p.child.kill();

    p.child.stdout?.pipe(StreamValues.withParser())
        .on('data', (data) => {
            let event = data.value;
            progressCallback && progressCallback(event);
        });

    p.child.stderr?.on('data', (data) => {
        logger.log(`Installing Error: ${data}`);
    });

    await p;

    logger.log(`Installed in ${new Date().getTime() - time} ms`);
    let installationPath = await appPath(udid, bundleID);

    return installationPath;
}

async function rsd(udid: string): Promise<{ host: string, port: string }> {
    logger.log(`creating quic tunel to device (udid: ${udid})`);

    let command = `echo ${configuration.sudoPassword} | sudo -S ${bazelExe} ` + baseArgs.concat(["start-quic-tunnel", "--udid", udid]).join(' ');
    logger.log(`Running ${command}`);

    return new Promise((resolve, reject) => {

        let p = _exec(
            command,
            { cwd: PYMDWORKSPACE }
        );

        logger.log(`rsd pid: ${p.child.pid}`);

        p.child.stdout?.pipe(StreamValues.withParser())
            .on('data', (data) => {
                p.child.stdout?.removeAllListeners();
                let info = data.value;
                if (info.host !== undefined && info.port !== undefined) {
                    logger.log(`RSD Info: ${info.host} ${info.port}`);
                    resolve({ host: info.host, port: info.port });
                }
            });

        p.child.stderr?.on('data', (data) => {
            logger.log(`RSD Error: ${data}`);
            // if (!data.includes('Password')) {
            //   reject(data);
            // }
        });
    });
}

async function debug(host: string, port: string): Promise<{ host: string, port: string }> {
    return new Promise((resolve, reject) => {
        logger.log(`launch debug server device (rsd: ${host} ${port})`);
        let args = baseArgs.concat(['debug-server', '--rsd', host, port]);

        logger.log(`Running bazel ${args.join(' ')}`);

        let p = _execFile(
            bazelExe,
            args,
            { shell: true, cwd: PYMDWORKSPACE }
        );

        p.child.stdout?.pipe(StreamValues.withParser())
            .on('data', (data) => {
                let info = data.value;
                logger.log(`Debug Server Info: ${info.host} ${info.port}`);
                resolve({ host: info.host, port: info.port });
            });

        p.child.stderr?.on('data', (data) => {
            logger.log(`Debug Server Error: ${data}`);
            reject(data);
        });
    });
}

export async function appPath(udid: string, bundleID: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let args = baseArgs.concat(['installed-app-path', '--udid', udid]);
        logger.log(`Running bazel ${args.join(' ')}`);

        let p = _execFile(
            bazelExe,
            args,
            { shell: true, cwd: PYMDWORKSPACE }
        );

        p.child.stdout?.pipe(StreamValues.withParser())
            .on('data', (data) => {
                let info = data.value;
                let appInfo = info[bundleID];
                if (appInfo === undefined) {
                    reject(`[pymobiledevice3] App ${bundleID} not found`);
                    return;
                }
                logger.log(`[pymobiledevice3] App Path: ${appInfo.Path}`);
                resolve(appInfo.Path);
            });

        p.child.stderr?.on('data', (data) => {
            logger.log(`[pymobiledevice3] Debug Server Error: ${data}`);
            reject(data);
        });
    });
}

export async function listDevices(): Promise<Device[]> {
    let args = baseArgs.concat(['list-device']);
    logger.log(`Running bazel ${args.join(' ')}`);
    return _execFile(
        bazelExe,
        args,
        { shell: true, cwd: PYMDWORKSPACE }
    )
        .then(({ stdout, stderr }): Device[] => {
            if (stderr) { logger.error(stderr); }
            logger.log(`list-device ${stdout} devices`);

            let devices: Device[] = JSON.parse(stdout) || {};

            /*
            {
                "BuildVersion": "19H365",
                "ConnectionType": "USB",
                "DeviceClass": "iPhone",
                "DeviceName": "\ud83d\udc36\ud83d\udcf1",
                "Identifier": "a50b2ae37f010229e0bbcfabe9a7a7e054fdb818",
                "ProductType": "iPhone9,1",
                "ProductVersion": "15.7.9"
            }
            */
            devices = devices
                .map((d: any): Device => ({
                    udid: d.Identifier,
                    name: d.DeviceName,
                    type: "Device",
                    version: d.ProductVersion,
                    buildVersion: d.BuildVersion,
                    runtime: `iOS ${d.ProductVersion}`,
                    sdk: "iphoneos",
                    modelName: d.ProductType,
                }));

            logger.log(`Found ${devices.length} devices`);

            return devices;
        }).catch((e: any) => {
            logger.log(`Could not find any connected device: ${e.toString().trimEnd()}`);
            e.stderr && logger.error(e.stderr);

            return [];
        });
}

export async function deviceInstall(udid: string, path: string, bundleID: string, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void) {
    return Promise.resolve()
        .then(() => install(udid, path, bundleID, cancellationToken, (event) => {
            progressCallback && progressCallback(event);
        }))
        .catch((e) => {
            vscode.window.showErrorMessage("Failed to install app on device");
        });
}

export async function debugserver(device: Device, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void): Promise<{ host: string, port: string, exec: PromiseWithChild<{ stdout: string, stderr: string }> }> {
    let time = new Date().getTime();

    let p: PromiseWithChild<{ stdout: string, stderr: string }>;
    if (isIOS17OrLater(device.version)) {
        let rsdInfo = await rsd(device.udid);
        let args = baseArgs.concat(['debug-server', '--rsd', rsdInfo.host, rsdInfo.port]);
        logger.log(`Running bazel ${args.join(' ')}`);
        p = _execFile(
            bazelExe,
            args,
            { shell: true, cwd: PYMDWORKSPACE }
        );
    } else {
        let args = baseArgs.concat(['debug-server', '--udid', device.udid, configuration.debugServerLocalPort.toString()]);
        logger.log(`Running bazel ${args.join(' ')}`);
        p = _execFile(
            bazelExe,
            args,
            { shell: true, cwd: PYMDWORKSPACE }
        );
    }

    cancellationToken.cancel = () => p.child.kill();

    let info: { host: string, port: string } = await new Promise((resolve, reject) => {
        p.catch(reject);

        p.child.stdout?.pipe(StreamValues.withParser())
            .on('data', (data) => {
                let info = data.value;
                resolve({ host: info.host, port: info.port });

                progressCallback && progressCallback({
                    "Event": "DebugServerLaunched",
                    "Port": info.port
                });
            });
    });

    logger.log(`Debugserver started in ${new Date().getTime() - time} ms`);

    if (!info.port) {
        throw Error('Could not start debugserver and get port');
    }

    return {
        host: info.host,
        port: info.port,
        exec: p,
    };
}
