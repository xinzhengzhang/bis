
import * as vscode from 'vscode';

export async function cpu()
{
    let sdk = await vscode.commands.executeCommand('ios-debug.targetSdk');
    if(sdk === "iphonesimulator")
    {
        // Return empty string to bazel 
        // It will use the current cpu properties of the current platform
        return "";
    } 
    else 
    {
        // Should not need support armv7?
        return "ios_arm64";
    }
}