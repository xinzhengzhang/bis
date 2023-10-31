import * as iosDeploy from './iosDeploy';
import * as simulators from './simulators';
import { Device, Target } from "./commonTypes";
import configuration from './configuration';
import * as vscode from "vscode";
import { ChildProcess, PromiseWithChild } from 'child_process';
import * as logger from "./logger";
import { isIOS17OrLater } from './utils';

let debugserverProcesses: { [port: string]: ChildProcess } = {};


export async function listTargets(): Promise<Target[]> {
	let [dev, sim] = await Promise.all([
		iosDeploy.listDevices(),
		simulators.listSimulators()
	]);

	return (dev as Target[]).concat(sim);
}

async function install(udid: string, path: string, ipaPath: string, bundleID: string, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void) {

	return await iosDeploy.deviceInstall({ udid, path }, cancellationToken, progressCallback);
}

export async function deviceInstall(device: Device, path: string, ipaPath: string, bundleID: string) {
	return vscode.window.withProgress({
		"location": vscode.ProgressLocation.Notification,
		"title": "Installing",
		"cancellable": true
	}, (progress, token) => {
		let lastProgress = 0;
		progress.report({ increment: 0 });

		let cancellationToken = { cancel: () => { } };

		token.onCancellationRequested((e) => { cancellationToken.cancel(); });

		logger.log(`Installing app (path: ${path}) to device (udid: ${device.udid})`);

		return Promise.resolve()
			.then(() => install(device.udid, path, ipaPath, bundleID, cancellationToken, (event) => {
				logger.log(event);

				let message = event.Status;

				progress.report({ increment: event.PercentComplete - lastProgress, message });

				lastProgress = event.PercentComplete;
			}))
			.catch((e) => {
				vscode.window.showErrorMessage("Failed to install app on device");
			});;
	});
}

export async function deviceAppPath(udid: string, bundleId: string): Promise<string | undefined> {
	return await iosDeploy.getAppDevicePath(udid, bundleId);
}

async function debugserver(device: Device, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void): Promise<{ host: string, port: string, exec: PromiseWithChild<{ stdout: string, stderr: string }> }> {
	return await iosDeploy.debugserver(device.udid, cancellationToken, progressCallback);
}

export async function deviceDebugserver(device: Device): Promise<void | { host: string, port: string }> {
	logger.log(`Starting debugserver for device (udid: ${device.udid})`);
	return vscode.window.withProgress({
		"location": vscode.ProgressLocation.Notification,
		"title": "Starting debugserver",
		"cancellable": true
	}, (progress, token) => {
		let cancellationToken = { cancel: () => { } };

		token.onCancellationRequested((e) => cancellationToken.cancel());

		return Promise.resolve()
			.then(() => debugserver(device, cancellationToken))
			.then(({ host, port, exec }) => {

				debugserverProcesses[port] = exec.child;
				logger.log(`Debugserver Host: ${host} Port: ${port}`);
				return { host, port };
			})
			.catch((e) => {
				vscode.window.showErrorMessage("Failed to start debugserver");
			});
	});
}

// Simulator

export async function simulatorGetPidFor(args: { udid: string, bundleId: string }) {
	let { udid, bundleId } = args;

	return simulators.getPidFor(udid, bundleId)
		.then((pid) => pid.toString());
}

export async function simulatorInstallAndLaunch(a: { udid: string, path: string, bundleId: string, args?: string[], env?: { [key: string]: string }, stdio: { stdout: string, stderr: string }, waitForDebugger: boolean }) {
	let { udid, path, bundleId, args, env, stdio: { stdout, stderr }, waitForDebugger } = a;

	return vscode.window.withProgress({
		"location": vscode.ProgressLocation.Notification,
		"title": "Simulator",
		"cancellable": false
	}, (progress, token) => {
		return Promise.resolve()
			.then(() => progress.report({ message: "Booting" }))
			.then(() => simulators.boot(udid))
			.then(() => progress.report({ message: "Installing app" }))
			.then(() => simulators.install(udid, path))
			.then(() => progress.report({ message: "Lauching app" }))
			.then(() => simulators.launch(udid, bundleId, args ? args : [], env ? env : {}, { stdout, stderr }, waitForDebugger))
			.then((pid) => pid.toString())
			.catch((e) => {
				vscode.window.showErrorMessage("Failed to install and launch app on simulator");
			});
	});
}