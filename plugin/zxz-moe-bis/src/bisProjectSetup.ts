import { _execFile } from "./utils";
import * as vscode from 'vscode';
import * as picker from './picker';
import * as inputer from './inputer';
import * as cpuProvider from './cpuProvider';
import * as logger from './logger';

export async function setup()
{
    logger.show();

    return Promise.all([
        inputer.buildTarget(),
        picker.compilationMode(),
        cpuProvider.cpu(),
    ]).then(
        (values) => {
            const buildTarget: string = values[0] ?? "";
            const compilationMode: string = values[1] ?? "";
            const cpu: string = values[2];
            let args = ['run', '@bis//:setup'];
            
            return Promise.all((vscode.workspace.workspaceFolders ?? []).map((folder) => {
                _execFile('bazel', args, {
                    cwd: folder.uri.path
                }).then(({stdout, stderr}) => {
                    logger.log(stdout);
                    logger.log(stderr);
                })
                .catch(e => {
                    logger.log(e);
                    logger.error("May be you have not setup bis rules in your WORKSPACE\n" + 
                    "Try to add the following configuration in your WORKSPACE\n" + 
                    "git_repository(\n" + 
                    "    name = \"bis\",\n" +
                    "    remote = \"git@github.com:xinzhengzhang/bis.git\",\n" + 
                    "    branch = \"main\"\n" +
                    ")");
                });
            }));
        }
    );

}