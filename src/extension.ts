import * as vscode from "vscode";
import path from "path";
import fs from "fs";
import Validator from "./validator";
import CodeActionProvider from "./providers/code-action.provider";
import { DependencyInfo } from "./interfaces/dependency.interface";
import { installDependencies } from "./cmd";
import { minimatch } from "minimatch";

export const diagnostics = vscode.languages.createDiagnosticCollection("dependency-diagnostics");
export const packageWatcher = vscode.workspace.createFileSystemWatcher("**/package.json", false, true, false);
export const validators = new Map<string, Validator>();

let ignoredDirectories = getIgnoredDirectories();

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
        vscode.commands.registerCommand("dependencyDiagnostics.installDependencies", (dep: DependencyInfo) => {
            installDependencies(dep.packageRoot);
        }),
    );

    /**************************************************/
    /********************* Events *********************/
    /**************************************************/

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (isValidPackageJson(doc.uri)) {
                let validator = validators.get(doc.uri.fsPath);
                validator?.validateDependencies();
                showNotification();
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("dependencyDiagnostics.ignoredDirectories")) {
                ignoredDirectories = getIgnoredDirectories();
                disposeValidators();
                scanWorkspacePackages();
            }
        }),
    );

    /**************************************************/
    /********************** Setup *********************/
    /**************************************************/

    setupPackageWatcher();
    await scanWorkspacePackages();
}

export function showNotification() {
    const invalidPackages = getInvalidPackages();
    if (invalidPackages.length === 0) return;

    vscode.window
        .showWarningMessage("Some dependencies are missing or have incorrect versions.", "Fix all", "Settings", "Dismiss")
        .then((selection) => {
            if (selection === "Fix all") {
                for (const pkg of invalidPackages) {
                    installDependencies(pkg);
                }
            } else if (selection === "Settings") {
                vscode.commands.executeCommand("workbench.action.openSettings", "@ext:iancovski.dependency-diagnostics");
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
        if (!isValidPackageJson(uri)) return;

        const doc = await vscode.workspace.openTextDocument(uri);
        addValidator(doc);
    });

    packageWatcher.onDidDelete((uri) => {
        if (!isValidPackageJson(uri)) return;

        removeValidator(uri.fsPath);
    });
}

async function scanWorkspacePackages() {
    const excludedDirectories = ignoredDirectories.length ? `{${ignoredDirectories.join(",")}}` : ignoredDirectories[0];
    const packageJsonFiles = await vscode.workspace.findFiles("**/package.json", excludedDirectories);

    for (const uri of packageJsonFiles) {
        const doc = await vscode.workspace.openTextDocument(uri);
        addValidator(doc);
    }

    showNotification();
}

function getIgnoredDirectories() {
    const ignoredDirectories = ["**/node_modules/**"];
    const ignoredDirectoriesConfig = vscode.workspace.getConfiguration("dependencyDiagnostics").get<string[]>("ignoredDirectories");

    if (ignoredDirectoriesConfig) {
        ignoredDirectories.push(...ignoredDirectoriesConfig);
    }

    return ignoredDirectories;
}

function isValidPackageJson(uri: vscode.Uri) {
    return path.basename(uri.fsPath) === "package.json" && !isDirectoryIgnored(uri);
}

function isDirectoryIgnored(uri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

    if (!workspaceFolder) return false;

    const normalizedPath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath).replace(/\\/g, "/");
    return ignoredDirectories.some((pattern) => minimatch(normalizedPath, pattern, { dot: true }));
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
}

function disposeValidators() {
    validators.forEach((validator) => {
        validator.dispose();
    });

    validators.clear();
}
