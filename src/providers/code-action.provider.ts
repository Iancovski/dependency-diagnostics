import * as vscode from "vscode";
import path from "path";
import { DependencyInfo, DependencyScope } from "../interfaces/dependency.interface";
import { detectPackageManager } from "../extension";

export default class CodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, _range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (
                diagnostic.source !== "dependency-diagnostics" ||
                !(diagnostic.code === "not-installed" || diagnostic.code === "version-mismatch")
            ) {
                continue;
            }

            const depInfo = extractDependencyInfo(document, diagnostic.range);
            if (!depInfo) continue;

            actions.push(createRunCommandAction(depInfo));
        }

        return actions;
    }
}

function createRunCommandAction(dep: DependencyInfo) {
    const packageManager = detectPackageManager(dep.packageRoot);
    const action = new vscode.CodeAction(`Run "${packageManager} install"`, vscode.CodeActionKind.QuickFix);

    action.command = {
        command: "dependencyDiagnostics.installDependencies",
        title: "Install all dependencies",
        arguments: [dep],
    };

    return action;
}

function extractDependencyInfo(doc: vscode.TextDocument, range: vscode.Range): DependencyInfo | null {
    const line = doc.lineAt(range.start.line).text;

    const match = /"([^"]+)"\s*:\s*"([^"]+)"/.exec(line);
    if (!match) return null;

    const packageRoot = path.dirname(doc.uri.fsPath);
    if (!packageRoot) return null;

    const scope = findDependencyScope(doc, range.start.line);
    if (!scope) return null;

    return {
        name: match[1],
        version: match[2],
        packageRoot,
        scope,
    };
}

function findDependencyScope(doc: vscode.TextDocument, depLine: number): DependencyScope | null {
    for (let line = depLine; line >= 0; line--) {
        const text = doc.lineAt(line).text;

        if (text.includes('"dependencies"')) return "dependencies";
        if (text.includes('"devDependencies"')) return "devDependencies";
    }

    return null;
}
