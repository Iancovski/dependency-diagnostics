import * as vscode from "vscode";
import { DependencyInfo } from "./interfaces/dependency.interface";

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
