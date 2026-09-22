# Mule Debug Package Finder

Searchable directory of MuleSoft connector debug/logger package names, with one-click copy for:
- The raw Java package name(s) (for Anypoint Runtime Manager → Settings → Logging)
- A ready-to-paste `log4j2.xml` `<AsyncLogger>` snippet

**Live:** https://upendra.fyi/tools/mule-debug-package-finder/

## Features
- Filter connectors by name, description, or package keyword
- Toggle DEBUG / TRACE level for generated snippets
- Copy a single connector's package(s) or full log4j2 XML block
- "Copy Visible as log4j2" bulk-copies a `<Loggers>` block for all currently filtered rows
- 100% client-side — connector list is a static CSV, no data ever leaves the browser

## Data
Connector data lives in [`debug-packages.csv`](./debug-packages.csv) (Connector Name, Description, Debug Package Name(s)).
To add or update a connector, edit that CSV — no code changes required.
