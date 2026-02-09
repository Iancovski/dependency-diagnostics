import * as vscode from "vscode";
import * as smartDeps from "./smart-deps";
import path from "path";
import SmartDepsCodeActionProvider from "./providers/code-action.provider";
import { DependencyInfo } from "./interfaces/dependency.interface";
import { PackageValidator } from "./interfaces/package.interface";

export const openedPackages = new Map<string, PackageValidator>();
export const diagnostics = vscode.languages.createDiagnosticCollection("smartDeps");

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(diagnostics);
    context.subscriptions.push({ dispose: () => smartDeps.disposePackageValidators() });

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

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && isPackageJson(editor.document)) {
                smartDeps.validateDependencies(editor.document);
                smartDeps.setupWatchers(editor.document);
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
        vscode.window.onDidChangeVisibleTextEditors(() => {
            for (const packagePath of openedPackages.keys()) {
                if (!isPackageJsonVisible(packagePath)) {
                    smartDeps.disposePackageValidator(packagePath);
                }
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            if (isPackageJson(doc)) {
                smartDeps.disposePackageValidator(doc.uri.fsPath);
            }
        }),
    );

    // Validate already open package.json

    const document = vscode.window.activeTextEditor?.document;

    if (document && isPackageJson(document)) {
        smartDeps.validateDependencies(document);
        smartDeps.setupWatchers(document);
    }
}

function isPackageJson(doc: vscode.TextDocument) {
    return path.basename(doc.uri.fsPath) === "package.json" && !doc.uri.fsPath.includes("node_modules");
}

function isPackageJsonVisible(packagePath: string): boolean {
    return vscode.window.visibleTextEditors.some((editor) => {
        return editor.document.uri.fsPath === packagePath;
    });
}
