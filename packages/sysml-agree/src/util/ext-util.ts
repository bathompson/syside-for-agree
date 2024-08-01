import * as vscode from "vscode";
import os from "os";
import { ExtensionOptions } from "../options/extension-options";
import { SysMLAgreeConfigs } from "../options/agree-ext-options";
/**
 * Searches the workspace root for the AADL base library for SysMLv2 (assumed to be called `aadl.library`) and, if found, offers to set the found library as the base library the extension uses.
 * @param options Object containing the user-defined options for this extension
 */
async function checkForWorkspaceAADLLib(options: ExtensionOptions) {
    const askAboutLib = options.get(SysMLAgreeConfigs.CHECK_LOCAL_AADL_BASE_LIB);
    const pathToLib = options.get(SysMLAgreeConfigs.AADL_BASE_LIB_PATH);
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
                await pathToLib.update(path, vscode.ConfigurationTarget.Workspace);
            } else {
                await askAboutLib.update(false, vscode.ConfigurationTarget.Workspace);
            }
        }
    }
}

/**
 * SysIDE has a configuration option for the SysML library path. If it's set, prompt the user to import it into this extension.
 * @param options
 */
async function checkForSysIDESysMLBaseLib(options: ExtensionOptions) {
    const pathToSysmlStandardLibrary = options.get(SysMLAgreeConfigs.SYSML_STD_LIB_PATH);
    const SysIDEStdLibPath = vscode.workspace.getConfiguration("syside").get("standardLibraryPath");
    if (SysIDEStdLibPath && !pathToSysmlStandardLibrary.isSet()) {
        const set = await vscode.window.showInformationMessage(
            "SysIDE has a path to the SysML standard libraries set. Would you like to use it as the SysML standard library for this extension as well?",
            "Global",
            "Workspace",
            "No"
        );
        if (set !== "No") {
            await pathToSysmlStandardLibrary.update(
                SysIDEStdLibPath,
                set === "Global"
                    ? vscode.ConfigurationTarget.Global
                    : vscode.ConfigurationTarget.Workspace
            );
        }
    }
}

export async function checkDetectableSettings(options: ExtensionOptions) {
    await checkForWorkspaceAADLLib(options);
    await checkForSysIDESysMLBaseLib(options);
}

/**
 * Checks to make sure required configs are set, and give the user an oppertunity to set them now if not.
 * @param options Object containing the user-defined options for this extension
 */

export async function checkRequiredConfigs(options: ExtensionOptions) {
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
                    filters: option.fileExtensions
                        ? { "Executable File": option.fileExtensions }
                        : {},
                };
                await vscode.window.showOpenDialog(options).then(async (fileUri) => {
                    if (fileUri && fileUri[0]) {
                        await option.update(
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

/**
 * Finds the last slash (forwards or backwards) in a string. Useful for when you need to get the directory a file is in.
 * @param str
 * @returns The index of the last slash in str
 */
export function findLastSlash(str: string): number {
    const lastIx = str.length - 1;
    for (let curIx = lastIx; curIx >= 0; curIx--) {
        if (str.charAt(curIx) === "\\" || str.charAt(curIx) === "/") {
            return curIx;
        }
    }
    return -1;
}
