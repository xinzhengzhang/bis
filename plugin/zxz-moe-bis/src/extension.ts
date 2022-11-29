// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as logger from './logger';
import * as picker from './picker';
import * as inputer from './inputer';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	logger.activate();
	picker.activate(context);
	inputer.activate(context);

	console.log('Congratulations, your extension "zxz-moe-bis" is now active!');

	let disposable = vscode.commands.registerCommand('zxz-moe-bis.cpu', async () => {
		let sdk = await vscode.commands.executeCommand('ios-debug.targetSdk');
		if(sdk === "iphonesimulator")
		{
			return "";
		} 
		else 
		{
			return "ios_arm64";
		}
	});
	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.pickCompilationMode', picker.pickCompilationMode));
	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.compilationMode', picker.compilationMode));

	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.inputBuildTarget', inputer.inputBuildTarget));
	context.subscriptions.push(vscode.commands.registerCommand('zxz-moe-bis.buildTarget', inputer.buildTarget));
}

export function deactivate() {}
