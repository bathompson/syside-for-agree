import { AstNode, LangiumDocument, LangiumServices, findDeclarationNodeAtOffset } from "langium";
import { TextEditor, Uri } from "vscode";
import { createSysMLServices, SysMLEmptyFileSystem } from "syside-languageserver";
import { isPartDefinition } from "syside-languageserver/lib/generated/ast";

interface SysMLDocument {
    document: LangiumDocument<AstNode>;
    dispose: () => Promise<void>;
}
/**
 * This can be used to run an AST procedure on a document. No editor is required.
 */
export type SysMLAstProcedure<T> = (doc: LangiumDocument<AstNode>) => T;

/**
 * This can be used to run an AST procedure on a document with information from the editor. Currently, only cursor position is supported.
 */
export type SysMLEditorProcedure<T> = (cursorNode: AstNode) => T;

/**
 * Map of predefined AST procedures.
 */
export const SysMLAstProcedures = {
    getQualifiedNames: getQualifiedPartNames,
};

/**
 * Map of predefined editor procedures.
 */
export const SysMLEditorProcedures = {
    getQualifiedNameAtPosition: getQualifiedPartNameAtPosition,
};

/**
 * This handles running AST procedures. This will set up a document, run the procedure, and dispose of the document when the procedure has finished.
 * @param sysmlDocument The document the procedure will be run on
 * @param procedure The AST procedure to be run
 */
export async function runAstProcedure<T>(
    sysmlDocument: string,
    procedure: SysMLAstProcedure<T>
): Promise<T> {
    //Create SysML services and extract the document
    const services = createSysMLServices(SysMLEmptyFileSystem).SysML;
    const document = await extractDocument(sysmlDocument, services);

    // run the procedure and retrieve the value
    const val = procedure(document.document);

    //Dispose document and return the value.
    document.dispose();
    return val;
}

/**
 * This handles running Editor procedures. This is similar to runAstProcedure, but will additionally provide the AST node at the cursor location as a parameter to the procedure.
 * @param editor The editor containing the document we want to run the procedure on
 * @param procedure The editor procedure to be run.
 */
export async function runEditorProcedure<T>(
    editor: TextEditor,
    procedure: SysMLEditorProcedure<T>
): Promise<T | undefined> {
    const services = createSysMLServices(SysMLEmptyFileSystem).SysML;
    const document = await extractDocument(editor.document.getText(), services);

    //Find the AST node at the cursor location and ensure it exists.
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

/**
 * Walk over the AST and find qualified names of part definitions.
 * @param node Current node of the AST
 * @returns A list containing the qualified names of any parts found in this node or children of this node.
 */
function getParts(node: AstNode): string[] {
    let parts: string[] = [];
    if (!isPartDefinition(node)) {
        //If we aren't a part definition, look for part definitions in this nodes children and add them to the array.
        for (const child of node.$children) {
            parts = parts.concat(getParts(child));
        }
    } else {
        //Else return an singleton array containing the qualified name of this part.
        return [node.$meta.qualifiedName];
    }
    return parts;
}

/**
 *
 * @param document Document we want to run this procedure on
 * @returns The list of qualified names of the parts in this document
 */
function getQualifiedPartNames(document: LangiumDocument<AstNode>): string[] {
    return getParts(document.astNodes[0]);
}

/**
 *
 * @param curNode The AST node at the editor cursor
 * @returns A qualified name if the current node is a part definition, undefined otherwise.
 */
function getQualifiedPartNameAtPosition(curNode: AstNode): string | undefined {
    if (!isPartDefinition(curNode)) {
        return;
    }
    return curNode.$meta.qualifiedName;
}

/**
 *
 * @param doc String containing a document we would like to parse
 * @param services Langium services needed to run the parser.
 * @returns The parsed document, along with a callback function to dispose.
 */
async function extractDocument(doc: string, services: LangiumServices): Promise<SysMLDocument> {
    //Generate a random string and create a path in memory for the document
    const uuid = generateString(16);
    const uri = Uri.parse(`memory:///${uuid}.sysml`);
    //Parse the document and hold the resulting document in memory
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(doc, uri);

    //Add document to the set of langium document
    services.shared.workspace.LangiumDocuments.addDocument(document);
    //Build the document.
    await services.shared.workspace.DocumentBuilder.build([document]);
    return {
        document,
        dispose: async () => {
            //When we call this function, we will remove the document from the list of active documents.
            await services.shared.workspace.DocumentBuilder.update([], [uri]);
        },
    };
}

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 *
 * @param length length of the generated string
 * @returns a string of specified length containing random characters
 */
function generateString(length: number): string {
    let result = " ";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

/**
 *
 * @param doc Document to find the AST node
 * @param pos Position of the cursor in the document
 * @returns The AST node at the cursor position
 */
function findCursorNode(doc: LangiumDocument, pos: number): AstNode | undefined {
    const rootNode = doc.parseResult.value.$cstNode;
    if (!rootNode) {
        return;
    }
    const leaf = findDeclarationNodeAtOffset(rootNode, pos);
    return leaf?.element;
}
