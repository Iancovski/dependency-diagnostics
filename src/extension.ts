import * as vscode from "vscode";
import path from "path";
import fs from "fs";
import Validator from "./validator";
import CodeActionProvider from "./providers/code-action.provider";
import { DependencyInfo } from "./interfaces/dependency.interface";
import { installDependencies } from "./cmd";

export const diagnostics = vscode.languages.createDiagnosticCollection("dependency-diagnostics");
export const packageWatcher = vscode.workspace.createFileSystemWatcher("**/package.json", false, true, false);
export const validators = new Map<string, Validator>();

export async function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(diagnostics);
    context.subscriptions.push(packageWatcher);
    context.subscriptions.push({ dispose: () => disposeValidators() });

    /**************************************************/
    /******************** Providers *******************/
    /**************************************************/

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider({ language: "json", pattern: "**/package.json" }, new CodeActionProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
        }),
    );

    /**************************************************/
    /******************** Commands ********************/
    /**************************************************/

    context.subscriptions.push(
        vscode.commands.registerCommand("dependency-diagnostics.install-dependencies", (dep: DependencyInfo) => {
            installDependencies(dep.packageRoot);
        }),
    );

    /**************************************************/
    /********************* Events *********************/
    /**************************************************/

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (isValidPackageJson(doc.uri.fsPath)) {
                let validator = validators.get(doc.uri.fsPath);
                validator?.validateDependencies();
                showNotification();
            }
        }),
    );

    /**************************************************/
    /********************** Setup *********************/
    /**************************************************/

    setupPackageWatcher();
    await scanWorkspacePackages();
    showNotification();
}

export function showNotification() {
    const invalidPackages = getInvalidPackages();
    if (invalidPackages.length === 0) return;

    vscode.window
        .showWarningMessage("Some dependencies are missing or have incorrect versions.", "Fix all", "Dismiss")
        .then((selection) => {
            if (selection === "Fix all") {
                for (const pkg of invalidPackages) {
                    installDependencies(pkg);
                }
            }
        });
}

export function detectPackageManager(root: string): "npm" | "yarn" | "pnpm" {
    if (fs.existsSync(path.join(root, "package-lock.json"))) return "npm";
    if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
    if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
    return "npm";
}

function getInvalidPackages() {
    let invalidPackages: string[] = [];

    for (const validator of validators.values()) {
        if (!validator.valid) {
            invalidPackages.push(validator.packageRoot);
        }
    }

    return invalidPackages;
}

function setupPackageWatcher() {
    packageWatcher.onDidCreate(async (uri) => {
        if (!isValidPackageJson(uri.fsPath)) return;

        const doc = await vscode.workspace.openTextDocument(uri);
        addValidator(doc);
    });

    packageWatcher.onDidDelete((uri) => {
        if (!isValidPackageJson(uri.fsPath)) return;

        removeValidator(uri.fsPath);
    });
}

async function scanWorkspacePackages() {
    const packageJsonFiles = await vscode.workspace.findFiles("**/package.json", "{**/node_modules/**,**/.angular/**}");

    for (const uri of packageJsonFiles) {
        const doc = await vscode.workspace.openTextDocument(uri);
        addValidator(doc);
    }
}

function isValidPackageJson(packagePath: string) {
    return path.basename(packagePath) === "package.json" && !packagePath.includes("node_modules") && !packagePath.includes(".angular");
}

function addValidator(doc: vscode.TextDocument) {
    const validator = new Validator(doc);
    validators.set(doc.uri.fsPath, validator);

    return validator;
}

function removeValidator(packagePath: string) {
    const validator = validators.get(packagePath);
    validator?.dispose();
    validators.delete(packagePath);

    diagnostics.delete(vscode.Uri.file(packagePath));
}

function disposeValidators() {
    validators.forEach((validator) => {
        validator.dispose();
    });
}
