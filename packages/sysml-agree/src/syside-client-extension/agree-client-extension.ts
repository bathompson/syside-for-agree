import * as vscode from "vscode";
import {
    GenericLanguageClient,
    LanguageClientExtension,
    MaybePromise,
    ServerConfig,
} from "syside-languageclient";
import os from "os";
import { Options } from "../util/options";
import { checkConfig } from "../util/ext-util";
import * as Actions from "./agree-actions";

export class AgreeClientExtension implements LanguageClientExtension {
    private extCtx: vscode.ExtensionContext;

    constructor(ctx: vscode.ExtensionContext) {
        this.extCtx = ctx;
    }

    onBeforeStart(context: unknown, config: ServerConfig): MaybePromise<void> {
        const serverPath = vscode.Uri.joinPath(
            this.extCtx.extensionUri,
            "dist/languageserver/main.js"
        );
        config.path = serverPath.fsPath;
    }
    onStarted(context: unknown, client: GenericLanguageClient): MaybePromise<void> {
        vscode.window.showInformationMessage("AGREE for SysMLv2 extension active!");

        const options = new Options();
        options.addOption(
            "sysml-agree",
            "translatorJarPath",
            "the path to the the modified SysML2AADL translator .jar",
            false,
            true,
            "jar"
        );
        options.addOption(
            "sysml-agree",
            "pathToOsateWithAgreeCLI",
            "the path to the OSATE installation with Agree CLI installed",
            false,
            true,
            os.platform() === "win32" ? "exe" : undefined
        );
        options.addOption(
            "sysml-agree",
            "pathToSysmlBaseLibrary",
            "the path to the SysMLv2 base library",
            true,
            true
        );
        options.addOption(
            "sysml-agree",
            "pathToAADLLibForSysml",
            "the path to the SysMLv2 AADL library",
            true,
            true
        );
        options.addOption("sysml-agree", "askAboutLocalAADLLibrary", "", false, false);
        options.addOption("sysml-agree", "keepTranslatedAADLFiles", "", false, false);

        checkConfig(options);

        const disposable = vscode.commands.registerCommand(
            "sysml-agree.runAgreeOnActiveFile",
            () => {
                Actions.runAgreeOnActiveFile(options);
            }
        );
        const disposable2 = vscode.commands.registerCommand(
            "sysml-agree.runAgreeOnThisFile",
            (uri) => {
                Actions.runAgreeOnThisFile(uri, options);
            }
        );

        const disposable3 = vscode.commands.registerCommand(
            "sysml-agree.runAgreeOnThisFolder",
            (uri) => {
                Actions.runAgreeOnThisFolder(uri, options);
            }
        );
        const disposable4 = vscode.commands.registerCommand(
            "sysml-agree.runAgreeOnActiveFileInFolder",
            (uri) => {
                Actions.runAgreeOnActiveFileInFolder(options);
            }
        );

        this.extCtx.subscriptions.push(disposable, disposable2, disposable3, disposable4);
    }
    onDeactivate(client: GenericLanguageClient): MaybePromise<void> {
        //Do nothing for now
    }
}
