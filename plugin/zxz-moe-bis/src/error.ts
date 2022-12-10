import * as vscode from "vscode";

// Error codes will be synchronized with /biz_setup.py

enum ErrorCode {
    notInDependencies = 166,
}

const errorMsgs: { [key: number]: string } = {
    [ErrorCode.notInDependencies]:
        "The file you opened is not a dependency of the target you specified",
};

export function showIfError(errCode: number) {
    var err = errorMsgs[errCode];
    if (err) {
        vscode.window.showErrorMessage(err);
    }
}
