
import { _execFile, _exec } from './utils';
import * as logger from "./logger";
import * as StreamValues from 'stream-json/streamers/StreamValues';
import { Device } from "./commonTypes";
import * as vscode from "vscode";
import { PromiseWithChild } from 'child_process';
import configuration from './configuration';
import { isIOS17OrLater } from './utils';
import * as path from 'path';

let PYMDWORKSPACE = "pymobiledevicelite";

export function activate(context: vscode.ExtensionContext) {
    // 获取当前扩展的路径
    let extensionPath = context.extensionPath;

    // 计算 pymobiledevicelite 完整路径
    PYMDWORKSPACE = path.join(extensionPath, 'pymobiledevicelite');
    logger.log(PYMDWORKSPACE);

    // Update bazel version
    let bazel_version = `USE_BAZEL_VERSION=${configuration.bazeliskVersion}`
    _exec(`echo ${bazel_version} > ${PYMDWORKSPACE}/.bazeliskrc`);

    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('bis.bazelisk_version')) {
            let bazel_version = `USE_BAZEL_VERSION=${configuration.bazeliskVersion}`
            _exec(`echo ${bazel_version} > ${PYMDWORKSPACE}/.bazeliskrc`);
        }
    });
}

const bazelExe = configuration.bazelExecutablePath;

const baseArgs = ['run', '//:pymobiledevicelite', '--'];

function handleError(code: number, message: string) {
    logger.error(`${message}\nerror code: ${code}`);
    throw new Error(`${message}\nerror code: ${code}`);
}

// to check if the specific device is connected via a tunnel or not
export async function rsdInfo(udid: string): Promise<{ host: string, port: number } | undefined> {
    let args = baseArgs.concat(['rsd-info', '--tunnel', udid]);
    logger.log(`Running bazel ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
        let p = _execFile(
            bazelExe,
            args,
            { shell: true, cwd: PYMDWORKSPACE }
        );

        p.child.stdout?.pipe(StreamValues.withParser())
            .on('data', (data) => {
                let output = data.value;
                if (output.code === 0) {
                    let rsd = output.data;
                    logger.log(`rsd-info: ${JSON.stringify(rsd)}`);
                    resolve({
                        host: rsd.host,
                        port: rsd.port,
                    });
                } else {
                    logger.error(output.message);
                    resolve(undefined);
                }
            });

        p.child.stderr?.on('data', (data) => {
            logger.log(`${data}`);
        });
    });
}

export async function statrTunnel(password: string): Promise<{host: string, port: number, pid: string, message: string}> {
    let args = baseArgs.concat(["tunneld", "--pid_file", configuration.daemonPidFile, "--host", configuration.daemonHost, "--port", configuration.daemonPort.toString()]);
    logger.log(`Running bazel ${args.join(' ')}`);

    let command = `echo ${password} | sudo -S ${bazelExe} ` + args.join(' ');

    return new Promise((resolve, reject) => {
      let p = _exec(
        command,
        { cwd: PYMDWORKSPACE }
      );

      p.child.stdout?.pipe(StreamValues.withParser())
      .on('data', (data) => {
          if (data.value.code === 0) {
            logger.log('Tunneld info: \n', data.value.data);
            resolve({
              host: data.value.data.host,
              port: data.value.data.port,
              pid: data.value.data.pid,
              message: `(${data.value.data.code})` + data.value.data.message
            });
          } else {
            logger.error(data.value.message);
            reject(`Could not start tunneld daemon`);
          }
      });

      p.child.stderr?.on('data', (data) => {
        logger.log(`${data}`);
      });
    });
  }

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
            let event = data.value.data;
            progressCallback && progressCallback(event);
        });

    p.child.stderr?.on('data', (data) => {
        logger.log(`${data}`);
    });

    await p;

    logger.log(`Installed in ${new Date().getTime() - time} ms`);
    let installationPath = await appPath(udid, bundleID);

    return installationPath;
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
                if (data.value.code === 0) {
                    let path = data.value.data[bundleID].Path;
                    logger.log(`App path: ${path}`);
                    resolve(path);
                } else {
                    handleError(data.value.code, data.value.message);
                    reject(`Could not find app path for ${bundleID}`);
                }
            });

        p.child.stderr?.on('data', (data) => {
            logger.error(`${data}`);
        });
    });
}

export async function listDevices(): Promise<Device[]> {
    let args = baseArgs.concat(['list-device']);
    logger.log(`Running bazel ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
        let p = _execFile(
            bazelExe,
            args,
            { shell: true, cwd: PYMDWORKSPACE }
        );

        p.child.stdout?.pipe(StreamValues.withParser())
            .on('data', (data) => {
                let output = data.value;
                if (output.code === 0) {
                    let devices: Device[] = output.data;
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

                    resolve(devices);
                } else {
                    handleError(data.value.code, data.value.message);
                    resolve([]);
                }
            });

        p.child.stderr?.on('data', (data) => {
            logger.log(`${data}`);
        });
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

export async function debugserver(device: Device, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void): Promise<{ host: string, port: number, exec: PromiseWithChild<{ stdout: string, stderr: string }> }> {
    let time = new Date().getTime();

    let p: PromiseWithChild<{ stdout: string, stderr: string }>;
    if (isIOS17OrLater(device.version)) {
        // check if rsd is running
        let rsd = await rsdInfo(device.udid);
        if (rsd === undefined) {
            const userInput = await vscode.window.showInputBox(
                {
                    title: "Input your password",
                    prompt: "This command requires root privileges.",
                    password: true,
                    ignoreFocusOut: true
                }
            );
            let tunnelInfo = await statrTunnel(userInput || "");
            logger.log('Tunneld info: ', tunnelInfo);
        } else {
            logger.log(`RSD info ${rsd.host} ${rsd.port}`);
        }
        let args = baseArgs.concat(['debug-server', '--tunnel', device.udid]);
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

    let info: { host: string, port: number } = await new Promise((resolve, reject) => {
        p.catch(reject);

        p.child.stdout?.pipe(StreamValues.withParser())
            .on('data', (data) => {
                let output = data.value;
                if (output.code === 0) {
                    logger.log(`debug server info:\nHost: ${output.data.host}\nPort: ${output.data.port}\nUsage: ${output.data.usage}`);
                } else {
                    handleError(data.value.code, data.value.message);
                }
                resolve({
                    host: output.data.host,
                    port: output.data.port,
                });

                progressCallback && progressCallback({
                    "Event": "DebugServerLaunched",
                    "Port": output.data.port
                });
            });

        p.child.stderr?.on('data', (data) => {
            logger.log(`${data}`);
        });
    });

    logger.log(`Debugserver started in ${new Date().getTime() - time} ms`);

    if (!info.port) {
        throw Error('Could not start debugserver and get port');
    }

    return {
        host: info.host,
        port: info.port,
        exec: p
    };
}
