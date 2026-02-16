# Dependency Diagnostics

Detect and fix missing or incorrect dependencies across all `package.json` files in your workspace.

## Demo

### Fix all notification
![Fix all](https://raw.githubusercontent.com/Iancovski/dependency-diagnostics/refs/heads/main/assets/gifs/notification.gif)


### Diagnostics and Quick Fixes
![Highlights and notification](https://raw.githubusercontent.com/Iancovski/dependency-diagnostics/refs/heads/main/assets/gifs/diagnostics.gif)

---

## Description

**Dependency Diagnostics** is a Visual Studio Code extension that automatically checks whether the dependencies declared in all `package.json` files in your workspace are installed and match the expected versions, making it suitable for monorepos and multi-package repositories.

If a dependency is missing or out of sync, Dependency Diagnostics highlights it and lets you fix the issue quickly.

## Features

* Detects missing dependencies
* Detects version mismatches between `package.json` and installed packages in `node_modules`
* Works automatically across the entire workspace (no need to open files)
* Shows a notification to install all dependencies
* Provides diagnostics and quick fixes to install dependencies

---

## Supported Dependency Types

Dependency Diagnostics checks:

* dependencies
* devDependencies

---

## Ignored Locations

To avoid false positives and unnecessary processing, Dependency Diagnostics ignores package.json files located in the following folders:

* `node_modules`
* `.angular`

---

## Roadmap (Planned)

* Configuration for ignored folders
* Support for `yarn` and `pnpm`

---

## Contributing

Issues and pull requests are welcome.
