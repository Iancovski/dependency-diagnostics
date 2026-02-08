import * as vscode from "vscode";
import * as smartDeps from "./smart-deps";
import path from "path";
import SmartDepsCodeActionProvider from "./providers/code-action.provider";
import { DependencyInfo } from "./interfaces/dependency.interface";

export const diagnostics = vscode.languages.createDiagnosticCollection("smartDeps");
export const packageLockWatchers = new Map<string, vscode.FileSystemWatcher>();
export const revalidationTimers = new Map<string, NodeJS.Timeout>();

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(diagnostics);
    context.subscriptions.push({ dispose: () => disposeNodeModulesWatchers(packageLockWatchers) });
    context.subscriptions.push({ dispose: () => disposeRevalidateTimers(revalidationTimers) });

    /**************************************************/
    /******************** Providers *******************/
    /**************************************************/

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider({ language: "json", pattern: "**/package.json" }, new SmartDepsCodeActionProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
        }),
    );

    /**************************************************/
    /******************** Commands ********************/
    /**************************************************/

    context.subscriptions.push(
        vscode.commands.registerCommand("smartDeps.installDependency", (dep: DependencyInfo) => {
            smartDeps.installDependency(dep);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("smartDeps.installAllDependencies", (dep: DependencyInfo) => {
            smartDeps.installAllDependencies(dep.packageRoot);
        }),
    );

    /**************************************************/
    /********************* Events *********************/
    /**************************************************/

    // vscode.window.onDidChangeTerminalState

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && isPackageJson(editor.document)) {
                smartDeps.validateDependencies(editor.document);
                smartDeps.setWatcher(editor.document);
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (isPackageJson(doc)) {
                smartDeps.validateDependencies(doc);
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            if (isPackageJson(doc)) {
                diagnostics.delete(doc.uri);
                smartDeps.clearWatcher(doc);
            }
        }),
    );

    // Validate already open package.json

    vscode.workspace.textDocuments.forEach((doc) => {
        if (isPackageJson(doc)) {
            smartDeps.validateDependencies(doc);
            smartDeps.setWatcher(doc);
        }
    });
}

function isPackageJson(doc: vscode.TextDocument) {
    return path.basename(doc.uri.fsPath) === "package.json" && !doc.uri.fsPath.includes("node_modules");
}

function disposeNodeModulesWatchers(watchers: Map<string, vscode.FileSystemWatcher>) {
    watchers.forEach((watcher) => watcher.dispose());
    watchers.clear();
}

function disposeRevalidateTimers(revalidateTimers: Map<string, NodeJS.Timeout>) {
    revalidateTimers.forEach((timer) => clearTimeout(timer));
    revalidateTimers.clear();
}
