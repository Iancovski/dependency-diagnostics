import * as vscode from "vscode";
import path from "path";
import semver from "semver";
import fs from "fs";
import { diagnostics } from "./extension";

export default class Validator {
    private document: vscode.TextDocument;
    private packageLockWatcher: vscode.FileSystemWatcher;
    private nodeModulesWatcher: vscode.FileSystemWatcher;
    private revalidationTimer: NodeJS.Timeout | null = null;

    public packageRoot: string;
    public valid = true;

    constructor(doc: vscode.TextDocument) {
        this.document = doc;
        this.packageRoot = path.dirname(doc.uri.fsPath);

        const packageLockDir = new vscode.RelativePattern(path.dirname(doc.uri.fsPath), "node_modules/.package-lock.json");
        this.packageLockWatcher = vscode.workspace.createFileSystemWatcher(packageLockDir);
        this.packageLockWatcher.onDidCreate(() => this.revalidate());
        this.packageLockWatcher.onDidChange(() => this.revalidate());

        const nodeModulesDir = new vscode.RelativePattern(path.dirname(doc.uri.fsPath), "node_modules");
        this.nodeModulesWatcher = vscode.workspace.createFileSystemWatcher(nodeModulesDir);
        this.nodeModulesWatcher.onDidDelete(() => this.validateDependencies());

        this.validateDependencies();
    }

    public dispose() {
        this.packageLockWatcher.dispose();
        this.nodeModulesWatcher.dispose();

        if (this.revalidationTimer) {
            clearTimeout(this.revalidationTimer);
        }
    }

    private revalidate() {
        if (this.revalidationTimer) clearTimeout(this.revalidationTimer);

        this.revalidationTimer = setTimeout(() => {
            this.validateDependencies();
        }, 1000);
    }

    public validateDependencies() {
        this.valid = true;
        diagnostics.delete(this.document.uri);

        const dir = path.dirname(this.document.uri.fsPath);

        const diagnosticsList: vscode.Diagnostic[] = [];
        const packageJson = JSON.parse(this.document.getText());
        const dependencies = this.getAllDependencies(packageJson);

        for (const [dependencyName, declaredVersion] of Object.entries(dependencies)) {
            const installedVersion = this.getInstalledVersion(dir, dependencyName as string);

            if (!this.isVersionValid(installedVersion, declaredVersion as string)) {
                const range = this.findVersionRange(this.document, dependencyName as string, declaredVersion as string);

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
            this.valid = false;
            diagnostics.set(this.document.uri, diagnosticsList);
        }
    }

    private getAllDependencies(pkg: any) {
        return {
            ...pkg.dependencies,
            ...pkg.devDependencies,
            ...pkg.optionalDependencies,
            ...pkg.peerDependencies,
        };
    }

    private getInstalledVersion(root: string, depName: string): string | null {
        try {
            const depPkgPath = path.join(root, "node_modules", depName, "package.json");

            const content = fs.readFileSync(depPkgPath, "utf8");
            const depPkg = JSON.parse(content);

            return depPkg.version;
        } catch {
            return null;
        }
    }

    private isVersionValid(installed: string | null, declared: string) {
        if (!installed) return false;

        return semver.satisfies(installed, declared, {
            includePrerelease: true,
        });
    }

    private findVersionRange(doc: vscode.TextDocument, depName: string, version: string): vscode.Range | null {
        const text = doc.getText();

        const regex = new RegExp(`"${depName}"\\s*:\\s*"(${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})"`);

        const match = regex.exec(text);
        if (!match || match.index === undefined) return null;

        const start = doc.positionAt(match.index + match[0].indexOf(match[1]));
        const end = start.translate(0, match[1].length);

        return new vscode.Range(start, end);
    }
}
