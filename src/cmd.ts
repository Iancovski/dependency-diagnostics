import * as vscode from "vscode";
import { detectPackageManager } from "./extension";

export async function installDependencies(cwd: string) {
    const terminal = vscode.window.createTerminal({ name: "Dependency Diagnostics", cwd: cwd });
    const packageManager = detectPackageManager(cwd);

    terminal.show();
    terminal.sendText(`${packageManager} install`);
}
