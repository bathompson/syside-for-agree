import { ExtensionContext, Uri } from "vscode";
import {
    GenericLanguageClient,
    LanguageClientExtension,
    MaybePromise,
    ServerConfig,
} from "syside-languageclient";

/**
 * This extensions implementation of LanguageClientExtension, which allows SysIDE to load and interact with this extension. Right now the only interaction this provides is using our custom language server.
 */
export class AgreeClientExtension implements LanguageClientExtension<ExtensionContext> {
    private agreeExtCtx: ExtensionContext;

    /**
     *
     * @param agreeExtCtx The ExtensionContext for this extension
     */
    constructor(agreeExtCtx: ExtensionContext) {
        this.agreeExtCtx = agreeExtCtx;
    }

    onBeforeStart(context: ExtensionContext, config: ServerConfig): MaybePromise<void> {
        const serverPath = Uri.joinPath(
            this.agreeExtCtx.extensionUri,
            "dist/languageserver/main.js"
        );
        //Here we set our custom version of the SysIDE language server as the language server being launced by SysIDE.
        config.path = serverPath.fsPath;
    }
    onStarted(context: ExtensionContext, client: GenericLanguageClient): MaybePromise<void> {
        //Do nothing for now
    }
    onDeactivate(client: GenericLanguageClient): MaybePromise<void> {
        //Do nothing for now
    }
}
