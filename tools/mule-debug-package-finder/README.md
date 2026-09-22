# Mule Debug Package Finder

Searchable directory of MuleSoft connector debug/logger package names, with one-click copy for:
- The raw Java package name(s) (for Anypoint Runtime Manager → Settings → Logging)
- A ready-to-paste `log4j2.xml` `<AsyncLogger>` snippet

**Live:** https://upendra.fyi/tools/mule-debug-package-finder/

## Features
- Filter connectors by name, description, or package keyword (multi-word, order-independent)
- Toggle DEBUG / TRACE level for generated snippets
- Click a package chip to copy just that package, or use the log4j icon to copy the row's full `<AsyncLogger>` snippet
- Sort by Most Copied (live, anonymous usage counts), A–Z, or Z–A
- 100% client-side — connector list is a static CSV, no data ever leaves the browser

## Data
Connector data lives in [`debug-packages.csv`](./debug-packages.csv) (Connector Name, Description, Debug Package Name(s)).
To add or update a connector, edit that CSV — no code changes required.
