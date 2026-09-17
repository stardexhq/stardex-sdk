import assert from "node:assert/strict";
import { test } from "node:test";
import { StardexApiError, StardexClient } from "../src/index.ts";

interface Seen {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/** A fetch that records each request and answers with `status` and `body`. */
function fakeFetch(status: number, body: unknown, seen: Seen[] = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(text, { status });
  }) as typeof fetch;
}

function client(status: number, body: unknown, seen: Seen[], apiKey?: string) {
  return new StardexClient({
    baseUrl: "http://localhost:8080/",
    apiKey,
    fetch: fakeFetch(status, body, seen),
  });
}

test("events builds the query string and skips undefined filters", async () => {
  const seen: Seen[] = [];
  const page = await client(200, { items: [], nextCursor: null }, seen).events({
    contractId: "CABC",
    kind: undefined,
    limit: 5,
  });

  assert.deepEqual(page, { items: [], nextCursor: null });
  assert.equal(seen[0].url, "http://localhost:8080/events?contractId=CABC&limit=5");
  assert.equal(seen[0].method, "GET");
});

test("requests carry the api key when one is set", async () => {
  const seen: Seen[] = [];
  await client(200, [], seen, "secret").accounts();
  assert.equal(seen[0].url, "http://localhost:8080/accounts");
  assert.equal(seen[0].headers.authorization, "Bearer secret");

  const anonymous: Seen[] = [];
  await client(200, [], anonymous).accounts();
  assert.equal(anonymous[0].headers.authorization, undefined);
});

test("invoices and payments pass their filters", async () => {
  const seen: Seen[] = [];
  const c = client(200, { items: [], nextCursor: null }, seen, "k");
  await c.invoices({ account: "GBIZ", status: "partial", cursor: "abc" });
  await c.payments({ status: "unmatched", limit: 10 });

  assert.equal(seen[0].url, "http://localhost:8080/invoices?account=GBIZ&status=partial&cursor=abc");
  assert.equal(seen[1].url, "http://localhost:8080/payments?status=unmatched&limit=10");
});

test("createInvoice posts the input as JSON", async () => {
  const seen: Seen[] = [];
  await client(201, { id: "1" }, seen, "k").createInvoice({
    account: "GBIZ",
    amount: "5",
    customerName: "Acme Ltd",
  });

  assert.equal(seen[0].url, "http://localhost:8080/invoices");
  assert.equal(seen[0].method, "POST");
  assert.equal(seen[0].headers["content-type"], "application/json");
  assert.deepEqual(seen[0].body, { account: "GBIZ", amount: "5", customerName: "Acme Ltd" });
});

test("invoice actions hit the right paths and encode ids", async () => {
  const seen: Seen[] = [];
  const c = client(200, {}, seen, "k");
  await c.invoice("12");
  await c.cancelInvoice("12");
  await c.matchPayment("7", "12");
  await c.ignorePayment("a/b");

  assert.deepEqual(
    seen.map((s) => `${s.method} ${s.url}`),
    [
      "GET http://localhost:8080/invoices/12",
      "POST http://localhost:8080/invoices/12/cancel",
      "POST http://localhost:8080/payments/7/match",
      "POST http://localhost:8080/payments/a%2Fb/ignore",
    ],
  );
  assert.deepEqual(seen[2].body, { invoiceId: "12" });
  assert.equal(seen[1].body, undefined);
});

test("exportCsv returns the CSV text", async () => {
  const seen: Seen[] = [];
  const csv = await client(200, "id,amount\n1,5.0000000\n", seen, "k").exportCsv("payments", {
    from: "2026-09-01",
  });

  assert.equal(csv, "id,amount\n1,5.0000000\n");
  assert.equal(seen[0].url, "http://localhost:8080/exports/payments.csv?from=2026-09-01");
});

test("errors carry the status and the backend's message", async () => {
  const err = await client(401, { error: "missing or invalid api key" }, [])
    .invoices()
    .catch((e: unknown) => e);

  assert.ok(err instanceof StardexApiError);
  assert.equal(err.status, 401);
  assert.equal(err.message, "missing or invalid api key");
});

test("errors without a JSON body get a generic message", async () => {
  await assert.rejects(client(503, "Service Unavailable", []).events(), /Stardex API error 503/);
});
