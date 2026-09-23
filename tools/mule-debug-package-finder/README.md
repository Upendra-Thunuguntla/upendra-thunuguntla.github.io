# Mule Debug Package Finder

Searchable directory of MuleSoft connector debug/logger package names, with one-click copy for:
- Connector and underlying driver package name(s) (for Anypoint Runtime Manager → Settings → Logging)
- A ready-to-paste `log4j2.xml` `<AsyncLogger>` snippet

**Live:** https://upendra.fyi/tools/mule-debug-package-finder/

## Features
- Filter connectors by name, description, or package keyword (multi-word, order-independent)
- Toggle DEBUG / TRACE level for generated snippets
- Click a package chip to copy just that package, or use the log4j icon to copy the row's full `<AsyncLogger>` snippet
- Show version notes and special driver instructions where available
- Sort by Most Copied (live, anonymous usage counts), A–Z, or Z–A
- Connector/package data is static and local; only anonymous package-copy counts use the ranking API

## Data
Connector data lives in [`debug-packages.csv`](./debug-packages.csv) with these columns:

`Connector Name, Description, Connector Package Name(s), Driver Package Name(s), Special Instructions, Version Notes`

The renderer remains backward-compatible with the original three-column format.

To add or update a connector, edit that CSV — no code changes required.
