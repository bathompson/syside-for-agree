import { Options } from "./options";
import * as vscode from "vscode";
import os from "os";

async function checkForWorkspaceAADLLib(options: Options) {
    const askAboutLib = options.get("askAboutLocalAADLLibrary");
    const pathToLib = options.get("pathToAADLLibForSysml");
    if (!askAboutLib.value()) {
        return;
    }
    const aadlLib = await vscode.workspace.findFiles("**/aadl.library/**/*.sysml");
    if (aadlLib.length > 0 && aadlLib[0].fsPath !== pathToLib.value()) {
        const path = aadlLib[0].fsPath.slice(
            0,
            aadlLib[0].fsPath.indexOf("aadl.library") + "aadl.library".length
        );
        const oldDir = pathToLib.value();
        if (path !== oldDir) {
            const set = await vscode.window.showInformationMessage(
                "Found local aadl.library folder. Would you like to set it as the workspace SysML AADL library?",
                "Yes",
                "No"
            );
            if (set === "Yes") {
                pathToLib.update(path, vscode.ConfigurationTarget.Workspace);
            } else {
                askAboutLib.update(false, vscode.ConfigurationTarget.Workspace);
            }
        }
    }
}

async function checkConfigPaths(options: Options) {
    const homeDir: vscode.Uri = vscode.Uri.file(os.homedir());

    for (const option of options) {
        if (option.valueRequired && !option.isSet()) {
            const answer = await vscode.window.showInformationMessage(
                `It looks like you have not set ${option.description}\n Would you like to set it?`,
                "Global",
                "Workspace",
                "No"
            );
            if (answer !== "No") {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    canSelectFiles: !option.isDir,
                    canSelectFolders: option.isDir,
                    openLabel: "Select",
                    defaultUri: homeDir,
                    filters: option.fileExtension
                        ? { "Executable File": [option.fileExtension] }
                        : {},
                };
                vscode.window.showOpenDialog(options).then((fileUri) => {
                    if (fileUri && fileUri[0]) {
                        option.update(
                            fileUri[0].fsPath,
                            answer === "Global"
                                ? vscode.ConfigurationTarget.Global
                                : vscode.ConfigurationTarget.Workspace
                        );
                    } else {
                        vscode.window.showErrorMessage("Path not set");
                    }
                });
            }
        }
    }
}

export function checkConfig(options: Options) {
    checkForWorkspaceAADLLib(options).then(() => checkConfigPaths(options));
}

export function findLastSlash(path: string): number {
    const lastIx = path.length - 1;
    for (let curIx = lastIx; curIx >= 0; curIx--) {
        if (path.charAt(curIx) === "\\" || path.charAt(curIx) === "/") {
            return curIx;
        }
    }
    return -1;
}
