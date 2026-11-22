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

## TypeScript

**What:** JavaScript with types. You declare what kind of value something is (a number, a list of cards…), and TypeScript checks it before the code runs.
**Analogy:** A spell-checker for code. It underlines mistakes while you type.
**Why we use it:** A card game has lots of data passed around. Types catch mix-ups early, and "strict mode" makes the checks as thorough as possible.

## tsconfig.json

**What:** The settings file for TypeScript in a package: how strict to be, which JavaScript version to target, and which built-in APIs exist.
**Why we use it:** The engine's tsconfig leaves out the browser (DOM) APIs on purpose, so the engine _can't_ touch the screen. That's how we keep it pure.

## devDependencies

**What:** Libraries needed only while developing (TypeScript, Vitest), not when the game runs. Installed with `pnpm add -D`.
**Why we use it:** It keeps the final game small and makes clear which tools are for builders only.
