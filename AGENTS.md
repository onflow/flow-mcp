# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, Gemini CLI) working in this
repository. Loaded automatically into agent context — keep it concise.

## Overview

`@outblock/flow-mcp` is a Model Context Protocol server that exposes Flow blockchain read/write
tools (balances, account info, contract source, token prices, PunchSwap quotes/swaps, ERC-20
transfers) to MCP clients. Written in TypeScript, built with [`fastmcp`](https://www.npmjs.com/package/fastmcp),
published to npm, and runnable via `npx @outblock/flow-mcp` or the `flow-mcp` bin. Source of
truth: `package.json` (name `@outblock/flow-mcp`, version `0.1.11`).

## Runtime and Toolchain

- Node `>=20.0.0`, Bun `>=1.2.0` (`package.json` `engines`).
- Bundler: `tsup` (ESM, `target: node14`, `splitting: true`) — see `tsup.config.ts`.
- Formatter/linter: Biome (`biome.json`, 2-space indent, 120 col, double quotes, semicolons).
- Tests: `bun test` (Bun's built-in test runner). CI uses `oven-sh/setup-bun@v2`.
- Path aliases: `@/*` → `src/*`, `@cadence/*` → `src/cadence/*` (`tsconfig.json`).

## Build and Test Commands

All scripts are defined in `package.json`:

- `bun install` — install deps (Bun is the canonical package manager; `bun.lockb` is committed).
- `bun run build` — `tsup` bundle to `dist/` (entries: `src/index.ts`, `src/bin/flow-mcp.ts`).
- `bun test` — run `*.test.ts` files under `src/tools/*/`.
- `bun run format` — `biome format . --write`.
- `bun run dev <file>` — launches `@wong2/mcp-cli` against `src/index.ts` via the `flow-mcp` CLI.
- `bun run inspect` — launches `@modelcontextprotocol/inspector` against `src/index.ts`.
- `npm start` / `node dist/index.js` — run the built server over stdio.
- `npm run start:sse` / `node dist/index.js --sse` — run over SSE on port `8080`, endpoint `/sse`
  (see `src/server.ts`).

## Architecture

- `src/index.ts` — entrypoint; parses `--sse` from `process.argv` and calls `createServer()` +
  `startServer()`.
- `src/server.ts` — builds a `FastMCP` instance named `flow-mcp` v0.1.11, registers every tool
  from `createTools()` and every prompt from `createPrompts()`. Tool errors are caught and
  returned as the string `"Internal server error in tool execution."`.
- `src/bin/flow-mcp.ts` — `yargs` CLI exposing `dev <file>`, `inspect <file>`, and `start`
  (default). Wired to `bin.flow-mcp` in `package.json`.
- `src/tools/` — one directory per tool, each with `index.ts` (exports a `ToolRegistration<T>`)
  and `schema.ts` (Zod input schema). `src/tools/index.ts` composes the exported registry.
- `src/prompts/flow/` — six MCP prompts mirroring the read-tools (flow balance, account info,
  coa, child account, contract, token balance).
- `src/cadence/scripts/standard/` — Cadence scripts bundled as text (`tsup` `.cdc` text loader).
  `src/cadence/transactions/` is currently empty.
- `src/utils/` — shared helpers: `config.ts`, `context.ts`, `types.ts`,
  `validateSchemaDescriptions.ts`, plus `evm/` and `flow/` subfolders.
- `src/types/tools.ts` — `ToolRegistration<T>` contract (`name`, `description`, `inputSchema`,
  `handler`) and `createTextResponse` helper.

## Registered MCP Tools

The live registry is `createTools()` in `src/tools/index.ts`. Seventeen tools are registered
(tool `name` strings are what clients call):

- `get_flow_balance` (`flowBalance/`)
- `get_token_balances` (`tokenBalance/`)
- `get_coa_account` (`coaAccount/`)
- `get_contract` (`getContract/`)
- `get_account_info` (`accountInfo/`)
- `get_child_account` (`childAccount/`)
- `get_token_price` (`getTokenPrice/`)
- `get_trending_pools` (`getTrendingPools/`)
- `get_pools_by_token` (`getPoolsByToken/`)
- `get_token_info` (`getTokenInfo/`)
- `get_flow_token_price_history` (`getTokenPriceHistory/`)
- `punchswap_quote`, `punchswap_swap` (`swap/`)
- `get_erc20_tokens`, `transfer_erc20_token` (`erc20/`)
- `get_evm_transaction_info` (`flowscan/`)
- `get_flow_history_price` (`getFlowHistoryPrice/`)

`src/tools/query/` (`execute_query`) exists but its import and registration are commented out
in `src/tools/index.ts` — do not treat it as active.

## Conventions and Gotchas

- Tool `name` strings are snake_case and must match exactly what callers use; do not rename
  without grepping clients. `src/utils/validateSchemaDescriptions.ts` enforces schema docs.
- When adding a tool: create `src/tools/<name>/{index.ts,schema.ts}` exporting a
  `ToolRegistration<YourSchema>` (see `src/types/tools.ts`), then add it to the array in
  `src/tools/index.ts`. Add `<name>.test.ts` or `index.test.ts` next to it (both conventions
  are in use — see `flowBalance/flowBalance.test.ts` vs `accountInfo/index.test.ts`).
- The README also lists a helper `scripts/create-tool.ts` — that script does not exist in this
  tree; scaffold tools manually.
- Imports across `src/tools/` use explicit `.js` extensions (ESM + `moduleResolution: bundler`).
  Match this pattern in new files.
- `tsup.config.ts` externalizes `@onflow/fcl`, `@onflow/types`, `sha3`, `elliptic`, `fastmcp`,
  `yargs`, `zod`, `zod-to-json-schema`. Adding new runtime deps that must ship with the bundle
  requires removing them from `external` or they will be resolved at runtime from node_modules.
- `.cdc` files are imported as text (`tsup` `loader` config); keep Cadence under
  `src/cadence/` and import via the `@cadence/*` alias or relative path.
- Env vars read by tools (see `.env.example`): `MAINNET_FLOW_ADDRESS`, `TESTNET_FLOW_ADDRESS`,
  `MAINNET_FLOW_PRIVATE_KEY`, `TESTNET_FLOW_PRIVATE_KEY`. Private keys are required for swap
  and ERC-20 transfer tools; never commit real values.
- Transport defaults to stdio; `--sse` switches to SSE on `localhost:8080/sse` (hardcoded in
  `src/server.ts`).
- Tool handlers must return a `CallToolResult` whose first `content` entry has a `.text` field
  — `src/server.ts` returns it directly if it is a string, else `JSON.stringify`s it.
- CI (`.github/workflows/unit-test.yml`) runs `bun test` on PRs that touch `src/**`. Publish
  workflow (`publish.yml`) runs on GitHub releases and requires tests + build to pass.
- Commit messages follow Conventional Commits (`feat` / `fix` / `BREAKING CHANGE`); version
  bumps flow from that convention (README "Commit Message Format").

## Files Not to Modify

- `dist/` — build output, regenerated by `bun run build`.
- `bun.lockb`, `package-lock.json` — lockfiles; update only via dependency changes.
- `src/cadence/**/*.cdc` — treat as vendored on-chain scripts; validate against mainnet before
  editing.
