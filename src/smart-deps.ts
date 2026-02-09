import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import semver from "semver";
import { DependencyInfo } from "./interfaces/dependency.interface";
import { diagnostics, openedPackages } from "./extension";

export function validateDependencies(doc: vscode.TextDocument) {
    diagnostics.delete(doc.uri);

    const dir = path.dirname(doc.uri.fsPath);

    if (!dir) return;

    const diagnosticsList: vscode.Diagnostic[] = [];
    const packageJson = JSON.parse(doc.getText());
    const dependencies = getAllDependencies(packageJson);

    for (const [dependencyName, declaredVersion] of Object.entries(dependencies)) {
        const installedVersion = getInstalledVersion(dir, dependencyName as string);

        if (!isVersionValid(installedVersion, declaredVersion as string)) {
            const range = findVersionRange(doc, dependencyName as string, declaredVersion as string);

            if (!range) continue;

            const message = installedVersion
                ? `Installed version (${installedVersion}) does not match declared version (${declaredVersion})`
                : `Dependency not installed`;

            const diagnostic = new vscode.Diagnostic(
                range,
                message,
                installedVersion ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
            );

            diagnostic.source = "smart-deps";
            diagnostic.code = installedVersion ? "version-mismatch" : "not-installed";

            diagnosticsList.push(diagnostic);
        }
    }

    if (diagnosticsList.length > 0) {
        diagnostics.set(doc.uri, diagnosticsList);

        const message =
            diagnosticsList.length === 1
                ? "A dependency is missing or has an incorrect version."
                : `Some dependencies are missing or have incorrect versions.`;

        vscode.window.showWarningMessage(message, "Fix all", "Dismiss").then((selection) => {
            if (selection === "Fix all") {
                installAllDependencies(dir);
            }
        });
    }
}

export function installDependency(dep: DependencyInfo) {
    const terminal = vscode.window.createTerminal({ name: "SmartDeps", cwd: dep.packageRoot });

    terminal.show();
    terminal.sendText(`npm install ${dep.name}@${dep.version}`);
}

export function installAllDependencies(root: string) {
    const terminal = vscode.window.createTerminal({ name: "SmartDeps", cwd: root });

    terminal.show();
    terminal.sendText("npm install");
}

export function setupWatchers(doc: vscode.TextDocument) {
    if (openedPackages.has(doc.uri.fsPath)) return;

    const packageLockDir = path.join(path.dirname(doc.uri.fsPath), "package-lock.json");
    const packageLockWatcher = vscode.workspace.createFileSystemWatcher(packageLockDir);
    packageLockWatcher.onDidCreate(() => revalidate(doc));
    packageLockWatcher.onDidChange(() => revalidate(doc));
    packageLockWatcher.onDidDelete(() => revalidate(doc));

    const nodeModulesDir = path.join(path.dirname(doc.uri.fsPath), "node_modules");
    const nodeModulesWatcher = vscode.workspace.createFileSystemWatcher(nodeModulesDir);
    nodeModulesWatcher.onDidDelete(() => validateDependencies(doc));

    openedPackages.set(doc.uri.fsPath, { packageLockWatcher, nodeModulesWatcher });
}

export function disposePackageValidator(packagePath: string) {
    const validator = openedPackages.get(packagePath);

    if (validator) {
        validator.packageLockWatcher.dispose();
        validator.nodeModulesWatcher.dispose();
        clearTimeout(validator.revalidationTimer);
        openedPackages.delete(packagePath);
    }

    diagnostics.delete(vscode.Uri.parse(packagePath));
}

export function disposePackageValidators() {
    openedPackages.forEach(({ packageLockWatcher, nodeModulesWatcher, revalidationTimer }) => {
        packageLockWatcher.dispose();
        nodeModulesWatcher.dispose();
        clearTimeout(revalidationTimer);
    });
}

function revalidate(doc: vscode.TextDocument) {
    const pkg = openedPackages.get(doc.uri.fsPath);
    if (!pkg) return;

    let timer = pkg.revalidationTimer;
    if (timer) clearTimeout(timer);

    pkg.revalidationTimer = setTimeout(() => {
        validateDependencies(doc);
    }, 1000);
}

function getAllDependencies(pkg: any) {
    return {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies,
    };
}

function getInstalledVersion(root: string, depName: string): string | null {
    try {
        const depPkgPath = path.join(root, "node_modules", depName, "package.json");

        const content = fs.readFileSync(depPkgPath, "utf8");
        const depPkg = JSON.parse(content);

        return depPkg.version;
    } catch {
        return null;
    }
}

function isVersionValid(installed: string | null, declared: string) {
    if (!installed) return false;

    return semver.satisfies(installed, declared, {
        includePrerelease: true,
    });
}

function findVersionRange(doc: vscode.TextDocument, depName: string, version: string): vscode.Range | null {
    const text = doc.getText();
    const regex = new RegExp(`"${depName}"\\s*:\\s*"(${escapeRegExp(version)})"`);

    const match = regex.exec(text);
    if (!match || match.index === undefined) return null;

    const start = doc.positionAt(match.index + match[0].indexOf(match[1]));
    const end = start.translate(0, match[1].length);

    return new vscode.Range(start, end);
}

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
