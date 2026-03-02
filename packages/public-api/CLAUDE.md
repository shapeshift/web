# Public API - LLM Instructions

## Running the Server Locally (Recommended)

Use bundled mode to avoid ESM/tsx module resolution issues:

```bash
pnpm run build:bundle && pnpm run start:prod
```

This bundles everything with esbuild into `dist/server.cjs` and runs it with plain Node.js.

## Code Style

This codebase does **not** use semicolons. Follow the existing style in each file.
