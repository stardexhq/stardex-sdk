# @stardex/sdk

TypeScript client and shared types for the [Stardex](https://github.com/stardexhq/stardex) backend API.

Stardex is open source payment reconciliation for businesses paid on Stellar. This package is what apps (and the Stardex frontend) use to talk to a running [stardex-backend](https://github.com/stardexhq/stardex-backend).

## Install

```bash
pnpm add @stardex/sdk
```

## Use

```ts
import { StardexClient } from "@stardex/sdk";

const stardex = new StardexClient({ baseUrl: "http://localhost:8080" });

const page = await stardex.events({ kind: "transfer", limit: 20 });
console.log(page.items, page.nextCursor);
```

Pass `page.nextCursor` back as `cursor` to fetch the next page.

The types (`StardexEvent`, `Page`, `EventQuery`) are exported from the same package, so the backend and frontend share one definition of every request and response.

## Develop

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build      # outputs dist/
```

Requires Node 25 (see `.node-version`). Tests run the TypeScript sources directly with `node --test`.

## Related repos

| Repo | What it is |
|---|---|
| [stardex](https://github.com/stardexhq/stardex) | Rust engine: ingests payments from Stellar, matches them to invoices, owns the database schema |
| [stardex-backend](https://github.com/stardexhq/stardex-backend) | HTTP API this client talks to |
| [stardex-frontend](https://github.com/stardexhq/stardex-frontend) | Web app built on this client |

## License

Apache-2.0
