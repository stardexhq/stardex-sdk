import type {
  Account,
  CreateInvoiceInput,
  EventQuery,
  ExportKind,
  ExportQuery,
  Invoice,
  InvoiceDetail,
  InvoiceQuery,
  Page,
  Payment,
  PaymentQuery,
  StardexEvent,
} from "./types.ts";

export interface StardexClientOptions {
  /** Base URL of a running Stardex backend, e.g. "http://localhost:8080". */
  baseUrl: string;
  /** Admin key for business data (invoices, payments, exports). Not needed for events. */
  apiKey?: string;
  /** Optional custom fetch (defaults to the global fetch). */
  fetch?: typeof fetch;
}

/** Thrown for any non-2xx response. `message` is the backend's error text. */
export class StardexApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StardexApiError";
    this.status = status;
  }
}

type Query = Record<string, string | number | undefined>;

/** Typed client for the Stardex backend API. */
export class StardexClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetchFn: typeof fetch;

  constructor(opts: StardexClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    // Bind to the global so the browser's `fetch` keeps `this === window`;
    // calling it as `this.fetchFn(...)` otherwise throws "Illegal invocation".
    this.fetchFn = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Query indexed events with optional filters + cursor pagination. */
  events(query: EventQuery = {}): Promise<Page<StardexEvent>> {
    return this.request("GET", "/events", { query: { ...query } });
  }

  /** Accounts watched for incoming payments. */
  accounts(): Promise<Account[]> {
    return this.request("GET", "/accounts");
  }

  invoices(query: InvoiceQuery = {}): Promise<Page<Invoice>> {
    return this.request("GET", "/invoices", { query: { ...query } });
  }

  /** One invoice with its payment instructions and allocations. */
  invoice(id: string): Promise<InvoiceDetail> {
    return this.request("GET", `/invoices/${encodeURIComponent(id)}`);
  }

  createInvoice(input: CreateInvoiceInput): Promise<InvoiceDetail> {
    return this.request("POST", "/invoices", { body: input });
  }

  cancelInvoice(id: string): Promise<InvoiceDetail> {
    return this.request("POST", `/invoices/${encodeURIComponent(id)}/cancel`);
  }

  payments(query: PaymentQuery = {}): Promise<Page<Payment>> {
    return this.request("GET", "/payments", { query: { ...query } });
  }

  /** Match an unmatched payment to an invoice by hand. */
  matchPayment(paymentId: string, invoiceId: string): Promise<Payment> {
    return this.request("POST", `/payments/${encodeURIComponent(paymentId)}/match`, {
      body: { invoiceId },
    });
  }

  /** Mark a payment as not related to any invoice. */
  ignorePayment(paymentId: string): Promise<Payment> {
    return this.request("POST", `/payments/${encodeURIComponent(paymentId)}/ignore`);
  }

  /** Download a CSV export as text. */
  async exportCsv(kind: ExportKind, query: ExportQuery = {}): Promise<string> {
    const res = await this.send("GET", `/exports/${kind}.csv`, { query: { ...query } });
    return res.text();
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<T> {
    const res = await this.send(method, path, opts);
    return (await res.json()) as T;
  }

  private async send(
    method: "GET" | "POST",
    path: string,
    opts: { query?: Query; body?: unknown },
  ): Promise<Response> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const search = params.toString();
    const qs = search ? `?${search}` : "";

    const headers: Record<string, string> = {};
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    if (opts.body !== undefined) headers["content-type"] = "application/json";

    const res = await this.fetchFn(`${this.baseUrl}${path}${qs}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    if (!res.ok) throw new StardexApiError(res.status, await errorMessage(res));
    return res;
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON; fall through to the generic message.
  }
  return `Stardex API error ${res.status}`;
}
