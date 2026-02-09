import * as vscode from "vscode";
import path from "path";
import Validator from "./validator";
import CodeActionProvider from "./providers/code-action.provider";
import { DependencyInfo } from "./interfaces/dependency.interface";
import { installAllDependencies, installDependency } from "./cmd";

export const validators = new Map<string, Validator>();
export const diagnostics = vscode.languages.createDiagnosticCollection("smartDeps");

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(diagnostics);
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
        vscode.commands.registerCommand("smartDeps.installDependency", (dep: DependencyInfo) => {
            installDependency(dep);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("smartDeps.installAllDependencies", (dep: DependencyInfo) => {
            installAllDependencies(dep.packageRoot);
        }),
    );

    /**************************************************/
    /********************* Events *********************/
    /**************************************************/

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => {
            if (isPackageJson(doc)) {
                let validator = validators.get(doc.uri.fsPath);

                if (!validator) {
                    validator = addValidator(doc);
                }

                validator.validateDependencies();
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (isPackageJson(doc)) {
                let validator = validators.get(doc.uri.fsPath);

                if (!validator) {
                    validator = addValidator(doc);
                }

                validator.validateDependencies();
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            if (isPackageJson(doc)) {
                removeValidator(doc.uri.fsPath);
            }
        }),
    );

    validateOpenedPackageJsonFiles();
}

function isPackageJson(doc: vscode.TextDocument) {
    return (
        path.basename(doc.uri.fsPath) === "package.json" && !doc.uri.fsPath.includes("node_modules") && !doc.uri.fsPath.includes(".angular")
    );
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

function validateOpenedPackageJsonFiles() {
    const doc = vscode.window.activeTextEditor?.document;

    if (doc && isPackageJson(doc)) {
        let validator = validators.get(doc.uri.fsPath);

        if (!validator) {
            validator = addValidator(doc);
        }

        validator.validateDependencies();
    }
}

function disposeValidators() {
    validators.forEach((validator) => {
        validator.dispose();
    });
}
