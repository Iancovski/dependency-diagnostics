# Dependency Diagnostics

**Dependency Diagnostics** is a Visual Studio Code extension that automatically checks whether the dependencies declared in all `package.json` files in your workspace are installed and match the expected versions, making it suitable for monorepos and multi-package repositories.

If a dependency is missing or out of sync, Dependency Diagnostics highlights it and lets you fix the issue quickly.

## Demo

### Fix all
![Fix all](https://raw.githubusercontent.com/Iancovski/dependency-diagnostics/refs/heads/main/assets/gifs/fix-all.gif)

### Diagnostics and Quick Fixes
![Diagnostics and Quick Fixes](https://raw.githubusercontent.com/Iancovski/dependency-diagnostics/refs/heads/main/assets/gifs/quick-fix.gif)

## Features

* Detects missing dependencies
* Detects version mismatches between `package.json` and installed packages in `node_modules`
* Works automatically across the entire workspace (no need to open files)
* Shows a notification to install all dependencies
* Provides diagnostics and quick fixes to install dependencies

## Settings

This extension contributes the following settings:

### `dependencyDiagnostics.ignoredDirectories`

Ignores `package.json` files inside directories that match the configured glob patterns. `node_modules` directories are ignored by default (no configuration needed).

```json
{
    "dependencyDiagnostics.ignoredDirectories": [
        "**/.angular/**",
        "client/**"
    ]
}
```

## Supported Package Managers

Dependency Diagnostics automatically detects the following package managers for installing dependencies:

* `npm`
* `yarn`
* `pnpm`

## Supported Dependency Types

The extension checks the following sections of package.json:

* `dependencies`
* `devDependencies`

## Ignored Locations

To avoid false positives and unnecessary processing, Dependency Diagnostics ignores package.json files located in the following folders:

* `node_modules`
* `.angular`

## Contributing

Issues and pull requests are welcome.
