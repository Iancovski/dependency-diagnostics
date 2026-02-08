import * as vscode from "vscode";
import path from "path";
import { DependencyInfo } from "../interfaces/dependency.interface";

export default class SmartDepsCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, _range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== "smart-deps" || !(diagnostic.code === "not-installed" || diagnostic.code === "version-mismatch")) {
                continue;
            }

            const depInfo = extractDependencyInfo(document, diagnostic.range);
            if (!depInfo) continue;

            actions.push(createRunCommandAction(depInfo));
            actions.push(diagnostic.code === "not-installed" ? createInstallAction(depInfo) : createUpdateAction(depInfo));
        }

        return actions;
    }
}

function createRunCommandAction(dep: DependencyInfo) {
    const action = new vscode.CodeAction(`Run "npm install"`, vscode.CodeActionKind.QuickFix);

    action.command = {
        command: "smartDeps.installAllDependencies",
        title: "Install all dependencies",
        arguments: [dep],
    };

    return action;
}

function createInstallAction(dep: DependencyInfo): vscode.CodeAction {
    const action = new vscode.CodeAction(`Install ${dep.name}`, vscode.CodeActionKind.QuickFix);

    action.command = {
        command: "smartDeps.installDependency",
        title: "Install dependency",
        arguments: [dep],
    };

    return action;
}

function createUpdateAction(dep: DependencyInfo): vscode.CodeAction {
    const action = new vscode.CodeAction(`Update ${dep.name} to ${dep.version}`, vscode.CodeActionKind.QuickFix);

    action.command = {
        command: "smartDeps.installDependency",
        title: "Update dependency",
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

    return {
        name: match[1],
        version: match[2],
        packageRoot: packageRoot,
    };
}
