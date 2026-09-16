import assert from "node:assert/strict";
import { test } from "node:test";
import { StardexClient } from "../src/index.ts";

function fakeFetch(status: number, body: unknown, seen: string[]): typeof fetch {
  return (async (input: string | URL | Request) => {
    seen.push(String(input));
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

test("events builds the query string and skips undefined filters", async () => {
  const seen: string[] = [];
  const client = new StardexClient({
    baseUrl: "http://localhost:8080/",
    fetch: fakeFetch(200, { items: [], nextCursor: null }, seen),
  });

  const page = await client.events({ contractId: "CABC", kind: undefined, limit: 5 });

  assert.deepEqual(page, { items: [], nextCursor: null });
  assert.equal(seen[0], "http://localhost:8080/events?contractId=CABC&limit=5");
});

test("events throws on a non-2xx response", async () => {
  const client = new StardexClient({
    baseUrl: "http://localhost:8080",
    fetch: fakeFetch(503, { error: "down" }, []),
  });

  await assert.rejects(client.events(), /Stardex API error 503/);
});
