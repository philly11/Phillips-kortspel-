# Learning Notes

A glossary of concepts used in this project and why we use them.

## Git

**What:** A tool that saves snapshots ("commits") of your project over time.
**Analogy:** Save points in a video game. You can always go back, and you can see what changed between saves.
**Why we use it:** Every working step gets a commit, so mistakes are easy to undo and the history shows how the game was built.

## package.json

**What:** The ID card of a JavaScript/TypeScript package: its name, the libraries it depends on, and its scripts (shortcut commands such as `test`).
**Why we use it:** Every package in this repo has one, and so does the root.

## Monorepo + pnpm workspaces

**What:** One repository containing several packages (`engine`, `bots`, `client`, `server`). `pnpm-workspace.yaml` tells pnpm where they are.
**Analogy:** One kitchen with separate stations. Each station has its own job, but they share the pantry and can pass dishes to each other.
**Why we use it:** The client, the bots and the server all use the same `engine` package, and they always get the latest version with no publishing step.
