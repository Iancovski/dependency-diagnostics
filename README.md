# SmartDeps

**SmartDeps** is a Visual Studio Code extension that automatically checks whether the dependencies declared in all `package.json` files in your workspace are installed and match the expected versions, making it suitable for monorepos and multi-package repositories.

If a dependency is missing or out of sync, SmartDeps highlights it and lets you fix the issue quickly.

## Demo

- Highlights and message
![Fix all](https://raw.githubusercontent.com/Iancovski/smart-deps/refs/heads/main/assets/gifs/fix-all.gif)

- Quick fix
![Quick fix](https://raw.githubusercontent.com/Iancovski/smart-deps/refs/heads/main/assets/gifs/quick-fix.gif)

---

## Features

* Detects missing dependencies
* Detects version mismatches between `package.json` and installed packages
* Works automatically across the entire workspace (no need to open files)
* Supports `npm` package manager
* Quick fix to install dependencies
* Automatic revalidation when:
  * `package.json` is saved
  * `node_modules` changes
* Works with multiple projects and monorepos

---

## How it works

When a workspace is opened, SmartDeps:

1. Scans the workspace for all `package.json` files
2. Validates dependencies in each project
3. Watches for:
   * Changes to `package.json`
   * Creation or deletion of packages
   * Changes in `node_modules`
4. Updates diagnostics automatically

Validation does not require files to be open in the editor.

---

## Quick Fix

If dependencies are missing or out of sync, SmartDeps shows:

* Inline warnings in `package.json`
* A notification offering to **Install dependencies**

Clicking the button runs `npm install` command for every package with inconsistent dependencies.

---

## Supported Dependency Types

SmartDeps checks:

* dependencies
* devDependencies

---

## Ignored Locations

To avoid false positives and unnecessary processing, SmartDeps ignores package.json files located into:

* `node_modules`
* `.angular` cache

---

## Performance

SmartDeps is designed to be lightweight:

* Uses filesystem watchers instead of polling
* Validates only when changes occur
* Uses debouncing to avoid excessive processing

Large workspaces and monorepos are supported.

---

## Roadmap (Planned)

* Configuration for ignored folders
* Support for `yarn` and `pnpm`

---

## Contributing

Issues and pull requests are welcome.
