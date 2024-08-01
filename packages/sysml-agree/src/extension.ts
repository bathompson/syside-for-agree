// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as os from "os";
import { AgreeClientExtension } from "./syside-client-extension/agree-client-extension";
import { ExtensionOptions } from "./options/extension-options";
import { checkDetectableSettings, checkRequiredConfigs } from "./util/ext-util";
import * as actions from "./util/agree-actions";
import { SysMLAgreeConfigs } from "./options/agree-ext-options";

const outputChannel = vscode.window.createOutputChannel("SysML Agree");

/**
 * Adds the configuration options defined in the `package.json` file for this extension to an ExtensionsOption object.
 * NOTICE: If you add new configurations to `package.json`, you should probably add them here as well.
 * @returns An ExtensionsOptions object giving easy access to the settings exposed to the user for this extension.
 */
function addExtensionOptions(): ExtensionOptions {
    const options = new ExtensionOptions("sysml-agree");
    options.addOption(
        SysMLAgreeConfigs.TRANSLATOR_JAR_PATH,
        "the path to the the modified SysML2AADL translator .jar",
        false,
        true,
        ["jar"]
    );
    options.addOption(
        SysMLAgreeConfigs.OSATE_PATH,
        "the path to the OSATE installation with Agree CLI installed",
        false,
        true,
        os.platform() === "win32" ? ["exe"] : undefined
    );

    options.addOption(
        SysMLAgreeConfigs.SYSML_STD_LIB_PATH,
        "the path to the SysMLv2 standard library",
        true,
        true
    );
    options.addOption(
        SysMLAgreeConfigs.AADL_BASE_LIB_PATH,
        "the path to the SysMLv2 AADL base library",
        true,
        true
    );
    //These last two options have default values, so we don't need to ask about them, as they will always have a value.
    options.addOption(SysMLAgreeConfigs.CHECK_LOCAL_AADL_BASE_LIB, "", false, false);
    options.addOption(SysMLAgreeConfigs.KEEP_TRANSLATED_AADL_FILES, "", false, false);

    return options;
}

/**
 * Registers callback functions for all UI commands in this extension
 * @param options Object containing the user-defined options for this extension
 * @returns An array containing the disposables for each of the registered commands
 */
function registerCommands(options: ExtensionOptions): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    disposables.push(
        vscode.commands.registerCommand("sysml-agree.runAgreeOnActiveFile", () => {
            actions.runAgreeOnActiveFile(options);
        })
    );
    disposables.push(
        vscode.commands.registerCommand("sysml-agree.runAgreeOnThisFile", (uri) => {
            actions.runAgreeOnThisFile(uri, options);
        })
    );

    disposables.push(
        vscode.commands.registerCommand("sysml-agree.runAgreeOnThisFolder", (uri) => {
            actions.runAgreeOnThisFolder(uri, options);
        })
    );
    disposables.push(
        vscode.commands.registerCommand("sysml-agree.runAgreeOnActiveFileInFolder", (uri) => {
            actions.runAgreeOnActiveFileInFolder(options);
        })
    );

    return disposables;
}

// This method is called when your extension is activated. Returned value from this method are accessable by other extensions.
export function activate(context: vscode.ExtensionContext) {
    vscode.window.showInformationMessage("AGREE for SysMLv2 extension active!");

    const options = addExtensionOptions();

    //We want checkDetectableSettings to finish executing before we run checkRequiredConfigs.
    //Since checkDetectableSettings is async, we use then() to make sure checkRequiredConfigs is executed after checkDetectableSettings is done.
    //Normally we would use the await keyword, but await only works in async functions, and activate() is not async.
    checkDetectableSettings(options).then(() => checkRequiredConfigs(options));

    const registeredCommandsDisposables = registerCommands(options);

    for (const disposable of registeredCommandsDisposables) {
        context.subscriptions.push(disposable);
    }

    //Create the client extension. This will allow SysIDE to launch our custom language server.
    const extensionApi = new AgreeClientExtension();

    //Return API so SysIDE can access it.
    return extensionApi;
}

// This method is called when your extension is deactivated
export function deactivate() {}
