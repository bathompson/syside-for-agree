import { AstNode, LangiumDocument, LangiumServices, findDeclarationNodeAtOffset } from "langium";
import { Position, TextEditor, Uri } from "vscode";
import { createSysMLServices, SysMLEmptyFileSystem } from "syside-languageserver";
import { isPartDefinition } from "syside-languageserver/lib/generated/ast";

interface SysMLDocument {
    document: LangiumDocument<AstNode>;
    dispose: () => Promise<void>;
}

export type SysMLAstProcedure<T> = (doc: LangiumDocument<AstNode>) => T;
export type SysMLEditorProcedure<T> = (cursorNode: AstNode) => T;

export const SysMLAstProcedures = {
    getQualifiedNames: getQualifiedNames,
};

export const SysMLEditorProcedures = {
    getQualifiedNameAtPosition: getQualifiedNameAtPosition,
};

export async function runAstProcedure<T>(
    sysmlDocument: string,
    procedure: SysMLAstProcedure<T>
): Promise<T> {
    const services = createSysMLServices(SysMLEmptyFileSystem).SysML;
    const document = await extractDocument(sysmlDocument, services);

    const val = procedure(document.document);

    document.dispose();
    return val;
}

export async function runEditorProcedure<T>(
    editor: TextEditor,
    procedure: SysMLEditorProcedure<T>
): Promise<T | undefined> {
    const services = createSysMLServices(SysMLEmptyFileSystem).SysML;
    const document = await extractDocument(editor.document.getText(), services);
    const curNode = findCursorNode(
        document.document,
        document.document.textDocument.offsetAt(editor.selection.active)
    );
    if (!curNode) {
        document.dispose();
        return;
    }
    const val = procedure(curNode);

    document.dispose();
    return val;
}

function getParts(node: AstNode): string[] {
    let parts: string[] = [];
    if (!isPartDefinition(node)) {
        for (const child of node.$children) {
            parts = parts.concat(getParts(child));
        }
    } else {
        return [node.$meta.qualifiedName];
    }
    return parts;
}

function getQualifiedNames(document: LangiumDocument<AstNode>): string[] {
    return getParts(document.astNodes[0]);
}

function getQualifiedNameAtPosition(curNode: AstNode): string | undefined {
    if (!isPartDefinition(curNode)) {
        console.log(typeof curNode);
        return;
    }
    return curNode.$meta.qualifiedName;
}

async function extractDocument(doc: string, services: LangiumServices): Promise<SysMLDocument> {
    const uuid = generateString(16);
    const uri = Uri.parse(`memory:///${uuid}.sysml`);
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(doc, uri);

    services.shared.workspace.LangiumDocuments.addDocument(document);
    await services.shared.workspace.DocumentBuilder.build([document]);
    return {
        document,
        dispose: async () => {
            await services.shared.workspace.DocumentBuilder.update([], [uri]);
        },
    };
}

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateString(length: number): string {
    let result = " ";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

function findCursorNode(doc: LangiumDocument, pos: number): AstNode | undefined {
    const rootNode = doc.parseResult.value.$cstNode;
    if (!rootNode) {
        return;
    }
    const leaf = findDeclarationNodeAtOffset(rootNode, pos);
    return leaf?.element;
}
