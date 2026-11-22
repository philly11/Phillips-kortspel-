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

## Pure function

**What:** A function whose output depends only on its inputs, and which changes nothing outside itself (no screen, network, clock or randomness).
**Analogy:** A calculator. 2 + 2 is always 4, and pressing it doesn't change anything else.
**Why we use it:** The whole engine is pure, so we can test any situation directly, replay a game exactly, and run the same code on the client, the server and in bots.

## Unit test (Vitest)

**What:** A small piece of code that calls your code and checks the result automatically. Vitest is the tool that runs them.
**Analogy:** A smoke detector. It stays quiet until something breaks, then it alerts you right away.
**Why we use it:** Tiến Lên has many rules and edge cases. Tests prove each rule works and warn us if a later change breaks an old rule.

## Card encoding (`rank * 4 + suit`)

**What:** Each card is one number from 0 to 51. Rank is multiplied by 4 so that rank always matters more than suit.
**Why we use it:** Comparing cards becomes `a > b`, sorting is a plain number sort, and a card is cheap to store and send over the network.
