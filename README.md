# @stardex/sdk

TypeScript client and shared types for the [Stardex](https://github.com/stardexhq/stardex) backend API.

Stardex is open source payment reconciliation for businesses paid on Stellar. This package is what apps (and the Stardex frontend) use to talk to a running [stardex-backend](https://github.com/stardexhq/stardex-backend).

## Install

```bash
pnpm add @stardex/sdk
```

## Use

```ts
import { StardexClient, StardexApiError } from "@stardex/sdk";

const stardex = new StardexClient({
  baseUrl: "http://localhost:8080",
  apiKey: process.env.STARDEX_ADMIN_KEY, // needed for invoices, payments and exports
});

// Create an invoice and show the customer how to pay it
const invoice = await stardex.createInvoice({
  account: "GABC...",
  amount: "25.50",
  customerName: "Acme Ltd",
});
console.log(invoice.paymentInstructions.muxedAddress); // M... address to pay
console.log(invoice.paymentInstructions.sep7Uri); // web+stellar:pay?... for a link or QR code

// Later: see what arrived and what still needs a human
const unmatched = await stardex.payments({ status: "unmatched" });
for (const payment of unmatched.items) {
  console.log(payment.amount, payment.unmatchedReason);
}
await stardex.matchPayment(unmatched.items[0].id, invoice.id);

// Export for the accountant
const csv = await stardex.exportCsv("payments", { from: "2026-09-01" });
```

Amounts are always decimal strings like `"25.5000000"`, never JavaScript numbers, so nothing is lost to rounding.

List methods return `{ items, nextCursor }`. Pass `nextCursor` back as `cursor` to fetch the next page.

Any non-2xx response throws a `StardexApiError` with `status` and the backend's message:

```ts
try {
  await stardex.cancelInvoice(invoice.id);
} catch (err) {
  if (err instanceof StardexApiError && err.status === 409) {
    console.log(err.message); // e.g. "a paid invoice cannot be cancelled"
  }
}
```

### Methods

| Method | Endpoint |
|---|---|
| `events(query?)` | `GET /events` (public) |
| `accounts()` | `GET /accounts` |
| `invoices(query?)` | `GET /invoices` |
| `invoice(id)` | `GET /invoices/:id` |
| `createInvoice(input)` | `POST /invoices` |
| `cancelInvoice(id)` | `POST /invoices/:id/cancel` |
| `payments(query?)` | `GET /payments` |
| `matchPayment(paymentId, invoiceId)` | `POST /payments/:id/match` |
| `ignorePayment(paymentId)` | `POST /payments/:id/ignore` |
| `exportCsv(kind, query?)` | `GET /exports/payments.csv` or `/exports/invoices.csv` |

All request and response types (`Invoice`, `InvoiceDetail`, `Payment`, `PaymentInstructions`, and so on) are exported from the package.

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
