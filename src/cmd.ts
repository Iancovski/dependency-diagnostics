import * as vscode from "vscode";

export async function installDependencies(cwd: string) {
    const terminal = vscode.window.createTerminal({ name: "Dependency Diagnostics", cwd: cwd });

    terminal.show();
    terminal.sendText("npm install");
}
