/** Types shared by the Stardex backend, this client, and the frontend. */

/**
 * Amounts are decimal strings in the asset's units, e.g. "5.0000000" for 5 XLM.
 * They are never JavaScript numbers, so no precision is lost.
 */
export type Amount = string;

/** A decoded contract event, as stored and returned by the API. */
export interface StardexEvent {
  /** Auto-incrementing id assigned by the store. */
  id: string;
  /** Contract that emitted the event. */
  contractId: string;
  /** Ledger (block) sequence the event was emitted in. */
  ledger: number;
  /** Decoder-defined event kind, e.g. "transfer", "swap". */
  kind: string;
  /** Decoded key/value fields. */
  fields: Record<string, string>;
  /** ISO timestamp of the ledger close. */
  closedAt: string;
}

/** A cursor-paginated list response. */
export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next page, or null at the end. */
  nextCursor: string | null;
}

/** Filters accepted by event queries. */
export interface EventQuery {
  contractId?: string;
  kind?: string;
  fromLedger?: number;
  toLedger?: number;
  limit?: number;
  cursor?: string;
}

/** A Stellar account watched for incoming payments. */
export interface Account {
  address: string;
  label: string | null;
  active: boolean;
  addedAt: string;
}

export type InvoiceStatus = "open" | "partial" | "paid" | "overpaid" | "cancelled";

export interface Invoice {
  id: string;
  /** Human invoice number, e.g. "INV-100001". */
  number: string;
  /** The watched account the invoice is paid into. */
  account: string;
  customerName: string | null;
  customerEmail: string | null;
  description: string | null;
  /** SEP-11 asset: "native" or "CODE:ISSUER". */
  asset: string;
  amount: Amount;
  amountReceived: Amount;
  /** The muxed ID / memo ID the customer pays with. */
  reference: string;
  status: InvoiceStatus;
  /** ISO date (YYYY-MM-DD). */
  dueDate: string | null;
  issuedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
}

/** How a customer pays an invoice. Either option lands with the same reference. */
export interface PaymentInstructions {
  /** Pay this muxed address with no memo. */
  muxedAddress: string;
  /** Or pay the plain account with `memo` as a MEMO_ID. */
  account: string;
  memoType: "id";
  memo: string;
  asset: string;
  amount: Amount;
  /** SEP-7 payment request URI (plain account plus memo), for links and QR codes. */
  sep7Uri: string;
}

export interface Allocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: Amount;
  matchedBy: "reference" | "manual";
  createdAt: string;
}

export interface InvoiceDetail extends Invoice {
  paymentInstructions: PaymentInstructions;
  allocations: Allocation[];
}

export interface CreateInvoiceInput {
  account: string;
  /** Decimal string, at most 7 decimal places. */
  amount: Amount;
  /** Defaults to "native" (XLM). */
  asset?: string;
  /** Defaults to "INV-<reference>". */
  number?: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  /** ISO date (YYYY-MM-DD). */
  dueDate?: string;
}

export interface InvoiceQuery {
  account?: string;
  status?: InvoiceStatus;
  limit?: number;
  cursor?: string;
}

export type PaymentMatchStatus = "unmatched" | "matched" | "ignored";

export type UnmatchedReason =
  | "no_reference"
  | "no_invoice"
  | "asset_mismatch"
  | "invoice_cancelled";

/** A payment into a watched account. */
export interface Payment {
  id: string;
  eventId: string;
  txHash: string;
  ledger: number;
  closedAt: string;
  account: string;
  fromAddress: string;
  asset: string;
  amount: Amount;
  referenceType: "id" | "text" | "hash" | null;
  reference: string | null;
  matchStatus: PaymentMatchStatus;
  unmatchedReason: UnmatchedReason | null;
  /** Set when the payment is matched to an invoice. */
  invoiceId: string | null;
}

export interface PaymentQuery {
  account?: string;
  status?: PaymentMatchStatus;
  limit?: number;
  cursor?: string;
}

export type ExportKind = "payments" | "invoices";

export interface ExportQuery {
  account?: string;
  /** ISO date or timestamp, inclusive. */
  from?: string;
  /** ISO date or timestamp, exclusive. */
  to?: string;
}

/** Error body the backend returns for any non-2xx response. */
export interface ApiErrorBody {
  error: string;
}
