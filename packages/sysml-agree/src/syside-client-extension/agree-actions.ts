import * as vscode from "vscode";
import { Options } from "../util/options";
import fs from "fs";
import cp from "child_process";
import os from "os";
import * as AstUtil from "../util/ast-util";
import { findLastSlash } from "../util/ext-util";

async function runAgreeOnFile(file: vscode.Uri, impl: string, options: Options) {
    for (const option of options) {
        if (option.valueRequired && !option.isSet()) {
            vscode.window.showErrorMessage(
                `You have not set ${option.description}, which is needed to run AGREE. Please set the value.`
            );
            return;
        }
    }
    const translatorJarPath = options.get("translatorJarPath").value();
    const osateExePath = options.get("pathToOsateWithAgreeCLI").value();
    const sysmlLibPath = options.get("pathToSysmlBaseLibrary").value();
    const aadlLibPath = options.get("pathToAADLLibForSysml").value();
    const keepTranslatedAADLFiles = options.get("keepTranslatedAADLFiles").value();

    const curWorkspaceFolder = vscode.workspace.getWorkspaceFolder(file)?.uri;
    if (!curWorkspaceFolder) {
        vscode.window.showErrorMessage("Error finding workspace folder");
        return;
    }
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
        `java -jar ${translatorJarPath} -a ${aadlLibPath} -s ${sysmlLibPath} -o ${tmpProjectPath} ${file.fsPath}`
    );
    fs.writeFileSync(`${tmpProjectPath}/.project`, projectConfigText);
    const jsonPath = `${curWorkspaceFolder.fsPath}/output.json`;
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

export async function runAgreeOnFolder(files: vscode.Uri[], impl: string, options: Options) {
    for (const option of options) {
        if (option.valueRequired && !option.isSet()) {
            vscode.window.showErrorMessage(
                `You have not set ${option.description}, which is needed to run AGREE. Please set the value.`
            );
            return;
        }
    }
    const translatorJarPath = options.get("translatorJarPath").value();
    const osateExePath = options.get("pathToOsateWithAgreeCLI").value();
    const sysmlLibPath = options.get("pathToSysmlBaseLibrary").value();
    const aadlLibPath = options.get("pathToAADLLibForSysml").value();
    const keepTranslatedAADLFiles = options.get("keepTranslatedAADLFiles").value();

    const curWorkspaceFolder = vscode.workspace.getWorkspaceFolder(files[0])?.uri;
    if (!curWorkspaceFolder) {
        vscode.window.showErrorMessage("Error finding workspace folder");
        return;
    }
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
    const jsonPath = `${curWorkspaceFolder.fsPath}/output.json`;
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

export async function runAgreeOnActiveFile(options: Options) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    if (activeEditor.document.languageId !== "sysml") {
        return;
    }
    const curFile = activeEditor.document;

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
    vscode.window.showInformationMessage(`Running agree on implementation ${impl}!`);
    runAgreeOnFile(curFile.uri, impl, options);
}

export async function runAgreeOnActiveFileInFolder(option: Options) {
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

    const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
    if (!folder) {
        vscode.window.showErrorMessage(
            `Cannot find folder in workspace containing ${activeEditor.document.uri.fsPath}`
        );
        return;
    }

    const relFolderPath = activeEditor.document.uri.fsPath.substring(
        folder.uri.fsPath.length + 1,
        findLastSlash(activeEditor.document.uri.fsPath)
    );

    vscode.window.showInformationMessage(`Running agree on implementation ${impl}!`);

    const files = await vscode.workspace.findFiles(`${relFolderPath}/*.sysml`);
    runAgreeOnFolder(files, impl, option);
}

export async function runAgreeOnThisFile(uri: vscode.Uri, options: Options) {
    const doc = await vscode.workspace.openTextDocument(uri);

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
    runAgreeOnFile(doc.uri, impl, options);
}

export async function runAgreeOnThisFolder(uri: vscode.Uri, options: Options) {
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

    runAgreeOnFolder(sysmlFiles, impl, options);
}

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
