# Contributing to @stardex/sdk

The general rules for all Stardex repos (claiming issues, PR size, commit style) are in the [org contributing guide](https://github.com/stardexhq/.github/blob/main/CONTRIBUTING.md). This file only covers what is specific to this repo.

## Setup

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Guidelines

- Types in `src/types.ts` must match what [stardex-backend](https://github.com/stardexhq/stardex-backend) actually returns. If you change a type, link the backend PR that changes the response.
- Every new client method gets a test in `test/` using a fake `fetch`, so tests never need a running backend.
- Keep the package dependency free. It runs in browsers and Node.
- Imports between source files use the `.ts` extension (`./types.ts`); the build rewrites them to `.js`.
