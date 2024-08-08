import * as vscode from "vscode";
import fs from "fs";
import cp from "child_process";
import os from "os";
import * as AstUtil from "../util/ast-util";
import { findWorkspaceSubfolder } from "../util/ext-util";
import { ExtensionOptions } from "../options/extension-options";
import { SysMLAgreeConfigs } from "../options/agree-ext-options";

/**
 * Similar to above, but will translate an array of SysMLv2 files to AGREE. The only meaningful differences between this method and runAgreeOnFile is logic to handle multiple files.
 * @param files The set of files to run AGREE on
 * @param impl The fully qualified name of the system implementation we want to run AGREE on
 * @param options Object containing the user-defined options for this extension
 */
export async function runAgree(
    files: vscode.Uri[],
    impl: string,
    options: ExtensionOptions,
    workspaceSubfolderPath: vscode.Uri
) {
    for (const option of options) {
        if (option.valueRequired && !option.isSet()) {
            vscode.window.showErrorMessage(
                `You have not set ${option.description}, which is needed to run AGREE. Please set the value.`
            );
            return;
        }
    }
    const translatorJarPath = options.get(SysMLAgreeConfigs.TRANSLATOR_JAR_PATH).value();
    const osateExePath = options.get(SysMLAgreeConfigs.OSATE_PATH).value();
    const sysmlLibPath = options.get(SysMLAgreeConfigs.SYSML_STD_LIB_PATH).value();
    const aadlLibPath = options.get(SysMLAgreeConfigs.AADL_BASE_LIB_PATH).value();
    const keepTranslatedAADLFiles = options
        .get(SysMLAgreeConfigs.KEEP_TRANSLATED_AADL_FILES)
        .value();

    const curWorkspaceFolder = workspaceSubfolderPath;

    const tmpFolderRootPath = keepTranslatedAADLFiles ? curWorkspaceFolder.fsPath : os.tmpdir();
    const tmpFolderPath = `${tmpFolderRootPath}/agreeTmp`;
    const tmpProjectPath = `${tmpFolderPath}/tmpProj`;
    if (fs.existsSync(tmpFolderPath)) {
        fs.rmSync(tmpFolderPath, { recursive: true });
    }
    fs.mkdirSync(tmpFolderPath);
    fs.mkdirSync(tmpProjectPath);
    vscode.window.showInformationMessage("Running agree...");
    cp.execSync(
        `java -jar ${translatorJarPath} -a ${aadlLibPath} -s ${sysmlLibPath} -o ${tmpProjectPath} ${files.map((uri) => uri.fsPath).join(" ")}`
    );
    fs.writeFileSync(`${tmpProjectPath}/.project`, projectConfigText);
    const jsonPath = `${curWorkspaceFolder.fsPath}/${impl.replace("::", "_")}.json`;
    cp.execSync(
        `${osateExePath} -application com.rockwellcollins.atc.agree.cli.Agree -noSplash -data ${tmpFolderPath} -p tmpProj -c ${impl} -strategy single -o ${jsonPath}`
    );
    if (!keepTranslatedAADLFiles) {
        fs.rmSync(tmpFolderPath, { recursive: true });
    }
    const jsonDoc = await vscode.workspace.openTextDocument(jsonPath);
    vscode.window.showTextDocument(jsonDoc);
    vscode.window.showInformationMessage("Done running Agree!");
}

/**
 * Runs AGREE on a SysML file in the active editor
 * @param options
 */
export async function runAgreeOnActiveFile(options: ExtensionOptions) {
    //Get the active editor and ensure it actually exists.
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    //Make sure the active editor is a SysML file
    if (activeEditor.document.languageId !== "sysml") {
        return;
    }

    const curFile = activeEditor.document;
    //Get the part definition at the cursor position
    const impl = await AstUtil.runEditorProcedure(
        activeEditor,
        AstUtil.SysMLEditorProcedures.getQualifiedNameAtPosition
    );
    //Make sure we actually found a part definition, and make sure it's an implementation.
    if (!impl) {
        vscode.window.showErrorMessage("Part implementation not found.");
        return;
    }
    if (!/(.)*\.(.)*/.test(impl)) {
        vscode.window.showErrorMessage(
            `Selected part ${impl} does not seem to be a system implementation`
        );
        return;
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(curFile.uri);
    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Cannot find workspace folder");
        return;
    }

    const relWorkspacePath = findWorkspaceSubfolder(workspaceFolder.uri, curFile.uri);
    //Run agree on the file
    vscode.window.showInformationMessage(`Running agree on implementation ${impl}!`);
    runAgree(
        [curFile.uri],
        impl,
        options,
        vscode.Uri.joinPath(workspaceFolder.uri, relWorkspacePath)
    );
}

/**
 * Same as runAgreeOnActiveFile, but includes other SysML files in the folder containing the SysML file.
 * @param option
 */
export async function runAgreeOnActiveFileInFolder(option: ExtensionOptions) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    if (activeEditor.document.languageId !== "sysml") {
        return;
    }

    const impl = await AstUtil.runEditorProcedure(
        activeEditor,
        AstUtil.SysMLEditorProcedures.getQualifiedNameAtPosition
    );

    if (!impl) {
        vscode.window.showErrorMessage("Part implementation not found.");
        return;
    }
    if (!/(.)*\.(.)*/.test(impl)) {
        vscode.window.showErrorMessage(
            `Selected part ${impl} does not seem to be a system implementation`
        );
        return;
    }

    //We need to do some work to find the actual folder this file is in, as VSCode doesn't keep track of subdirectories.
    //NOTE: Workspace folders in VSCode refer to top level folders. When you open a folder in VSCode, that folder becomes a workspace directory and none of it's children do.
    //You can add more than one workspace folder, but they would probably not be children of an existing workspace folder and they must be added manually by the user.
    const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
    if (!folder) {
        vscode.window.showErrorMessage(
            `Cannot find folder in workspace containing ${activeEditor.document.uri.fsPath}`
        );
        return;
    }
    //Here we get the folder path relative to the root of the VSCode workspace.
    const relFolderPath = findWorkspaceSubfolder(folder.uri, activeEditor.document.uri);

    vscode.window.showInformationMessage(`Running agree on implementation ${impl}!`);

    //Get all SysML files in the folder and run AGREE on those files.
    const files = await vscode.workspace.findFiles(`${relFolderPath}/*.sysml`);
    runAgree(files, impl, option, vscode.Uri.joinPath(folder.uri, relFolderPath));
}

/**
 * Run AGREE on a non-active file. Similar to runAgreeOnActiveFile
 * @param uri The URI of a SysML file
 * @param options
 */
export async function runAgreeOnThisFile(uri: vscode.Uri, options: ExtensionOptions) {
    //Open the text document. This will not display it to the user.
    const doc = await vscode.workspace.openTextDocument(uri);

    //Get all possible implementations in this file and display them to the user so they may select one to use.
    const impls = await AstUtil.runAstProcedure(
        doc.getText(),
        AstUtil.SysMLAstProcedures.getQualifiedNames
    ).then((names) => {
        return names.filter((name) => /(.)*\.(.)*/.test(name));
    });

    if (impls.length <= 0) {
        vscode.window.showErrorMessage("No implementations found in the provided SysML document.");
        return;
    }

    const impl = await vscode.window.showQuickPick(impls);
    if (!impl) {
        vscode.window.showInformationMessage("Agree run cancelled.");
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Cannot find workspace folder");
        return;
    }
    const workspaceSubfolderPath = findWorkspaceSubfolder(workspaceFolder.uri, uri);

    runAgree(
        [doc.uri],
        impl,
        options,
        vscode.Uri.joinPath(workspaceFolder.uri, workspaceSubfolderPath)
    );
}

/**
 * Similar to runAgreeOnThisFile but works on a whole folder instead of just one file.
 * @param uri The URI of a folder containing SysML models
 * @param options
 */
export async function runAgreeOnThisFolder(uri: vscode.Uri, options: ExtensionOptions) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
        vscode.window.showErrorMessage("No folder found.");
        return;
    }
    const sysmlFiles = await vscode.workspace.findFiles(
        `${uri.fsPath.substring(folder.uri.fsPath.length + 1)}/*.sysml`
    );

    if (sysmlFiles.length <= 0) {
        vscode.window.showErrorMessage(`No .sysml files found in ${uri.fsPath}`);
        return;
    }

    const impls: string[][] = [];
    for (const file of sysmlFiles) {
        const doc = await vscode.workspace.openTextDocument(file);
        impls.push(
            await AstUtil.runAstProcedure(
                doc.getText(),
                AstUtil.SysMLAstProcedures.getQualifiedNames
            ).then((names) => {
                return names.filter((name) => /(.)*\.(.)*/.test(name));
            })
        );
    }

    if (impls.length <= 0) {
        vscode.window.showErrorMessage("No implementations found in the provided SysML project.");
        return;
    }

    const impl = await vscode.window.showQuickPick(impls.flat());

    if (!impl) {
        vscode.window.showInformationMessage("Agree run cancelled.");
        return;
    }

    runAgree(sysmlFiles, impl, options, uri);
}

/**
 * This is the bit of XML required to make a .project file for an Eclipse project. This is needed to run AGREE from the command line.
 */
const projectConfigText = `<?xml version="1.0" encoding="UTF-8"?>
<projectDescription>
	<name>tmpProj</name>
	<comment></comment>
	<projects>
	</projects>
	<buildSpec>
		<buildCommand>
			<name>org.eclipse.xtext.ui.shared.xtextBuilder</name>
			<arguments>
			</arguments>
		</buildCommand>
	</buildSpec>
	<natures>
		<nature>org.osate.core.aadlnature</nature>
		<nature>org.eclipse.xtext.ui.shared.xtextNature</nature>
	</natures>
</projectDescription>`;
