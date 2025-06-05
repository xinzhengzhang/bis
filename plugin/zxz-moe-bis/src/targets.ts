import * as devicectl from './devicectl';
import * as simulators from './simulators';
import { Device, Target } from "./commonTypes";
import configuration from './configuration';
import * as vscode from "vscode";
import { ChildProcess, PromiseWithChild } from 'child_process';
import * as logger from "./logger";

let debugserverProcesses: { [port: number]: ChildProcess } = {};

export async function listTargets(): Promise<Target[]> {
	let [dev, sim] = await Promise.all([
		devicectl.listDevices(),
		simulators.listSimulators()
	]);

	return (dev as Target[]).concat(sim);
}

async function install(udid: string, path: string, bundleID: string, cancellationToken: { cancel(): void }, progressCallback?: (event: any) => void) {
	return devicectl.deviceInstall(udid, path, cancellationToken, progressCallback);
}

export async function deviceInstall(device: Device, path: string, bundleID: string) {
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
			.then(() => install(device.udid, path, bundleID, cancellationToken, (event) => {
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
	return await devicectl.appPath(udid, bundleId);
}

// if the process can not started with --console options no log will produced
export async function launchApp(udid: string, bundleId: string, preferredLogPath: string): Promise<Number|undefined> {
	return await devicectl.launchProcess(udid, bundleId, preferredLogPath);
}

export async function deviceGetPidFor(args: { udid: string, appPath: string }) {
	let { udid, appPath } = args;

	return devicectl.getPidFor(udid, appPath);
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