// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as logger from './logger';
import * as picker from './picker';
import * as inputer from './inputer';
import * as cpuProvider from './cpuProvider';
import * as bisProjectSetup from './bisProjectSetup';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	logger.activate();

	console.log('Congratulations, your extension "zxz-moe-bis" is now active!');

	// Component
	context.subscriptions.push(picker.activate(context));
	context.subscriptions.push(inputer.activate(context));

	// Commands get variable
	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.cpu', cpuProvider.cpu));

	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.compilationMode', picker.compilationMode));

	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.buildTarget', inputer.buildTarget));

	// Commands action
	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.setup', bisProjectSetup.setup));

	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.pickCompilationMode', picker.pickCompilationMode));

	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.inputBuildTarget', inputer.inputBuildTarget));
}

export function deactivate() {}
