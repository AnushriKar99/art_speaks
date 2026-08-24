import { Suspense } from "react";
import Link from "next/link";
import { getAdminOrders, type AdminOrder } from "@/lib/data/admin";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { OrderActions, type NextAction } from "@/components/admin/order-actions";
import { PreparedToggle } from "@/components/admin/prepared-toggle";

export const metadata = { title: "Art Speaks | Orders" };

/**
 * The filter bar.
 *
 * "Live" is every order still moving — placed but not finished with. Pending is
 * a subset of it, kept separate because it is the one status that needs the
 * studio to do something. Cancelled is the opposite: a record, not work.
 *
 * All is the default so the page still shows everything to someone who has not
 * noticed the filter — a delivered order silently missing would read as data
 * loss rather than a view.
 */
const FILTERS = [
  {
    key: "all",
    label: "All",
    empty: "No orders yet. They appear here as soon as someone checks out.",
  },
  {
    key: "live",
    label: "Live",
    empty: "Nothing in flight — every order is delivered or cancelled.",
  },
  { key: "pending", label: "Pending", empty: "No orders waiting on you. 🎉" },
  { key: "cancelled", label: "Cancelled", empty: "No cancelled orders." },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const LIVE: AdminOrder["status"][] = ["pending", "paid", "shipped"];

function matches(key: FilterKey, status: AdminOrder["status"]): boolean {
  switch (key) {
    case "live":
      return LIVE.includes(status);
    case "pending":
      return status === "pending";
    case "cancelled":
      return status === "cancelled";
    default:
      return true;
  }
}

/** An unknown ?status= falls back to All rather than showing an empty page. */
function parseFilter(raw: string | undefined): FilterKey {
  return FILTERS.find((f) => f.key === raw)?.key ?? "all";
}

const CHANNEL_LABEL: Record<AdminOrder["channel"], string> = {
  whatsapp: "WhatsApp",
  offline: "In person",
  online: "Online",
};

const STATUS_TONE: Record<AdminOrder["status"], string> = {
  pending: "bg-lemon-yellow text-on-tertiary-container",
  paid: "bg-secondary-container text-on-secondary-container",
  shipped: "bg-primary-container text-on-primary-container",
  delivered: "bg-surface-container-high text-on-surface-variant",
  cancelled: "bg-error-container text-on-error-container",
};

/**
 * What you can sensibly do next, rather than every status at once.
 *
 * Cancel carries `confirm` because cancelled is terminal — this function
 * returns nothing from it, so there is no way back through the UI. Every other
 * action here is reversible, which is why it is the only one that asks.
 *
 * `allPrepared` gates "Mark shipped": shipping something the studio has not
 * actually finished making is the one sequencing mistake this page can still
 * make by itself, since nothing else in the order flow depends on the
 * prepared ticks. Disabled rather than hidden, so the next step is still
 * visible — just not clickable yet.
 */
function nextActions(status: AdminOrder["status"], allPrepared: boolean): NextAction[] {
  switch (status) {
    case "pending":
      return [
        { to: "paid", label: "Mark paid", busyLabel: "Marking paid…", primary: true },
        { to: "cancelled", label: "Cancel", busyLabel: "Cancelling…", primary: false, confirm: true },
      ];
    case "paid":
      // "Back to pending" is what makes the stock restore in 0014 reachable —
      // without it a mistaken "Mark paid" permanently lowers the count, and a
      // piece sitting in the studio eventually becomes unorderable.
      return [
        {
          to: "shipped",
          label: "Mark shipped",
          busyLabel: "Marking shipped…",
          primary: true,
          disabled: !allPrepared,
          disabledReason: "Tick every piece prepared before shipping.",
        },
        { to: "pending", label: "Back to pending", busyLabel: "Reverting…", primary: false },
        { to: "cancelled", label: "Cancel", busyLabel: "Cancelling…", primary: false, confirm: true },
      ];
    case "shipped":
      return [
        { to: "delivered", label: "Mark delivered", busyLabel: "Marking delivered…", primary: true },
        { to: "paid", label: "Back to paid", busyLabel: "Reverting…", primary: false },
      ];
    default:
      return [];
  }
}

function formatAddress(a: Record<string, string> | null): string {
  if (!a) return "";
  return [a.line1, a.line2, a.city, a.state, a.pincode]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Stands in while the orders query is in flight.
 *
 * Shaped like the real thing — a chip row and three cards — so the page does
 * not jump when the data lands. Sized in the same rhythm rather than measured
 * exactly; close is what stops the eye noticing.
 */
function OrdersSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-5 w-40 rounded-full bg-surface-container-high mb-4" />
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <div
            key={f.key}
            className="h-10 w-24 rounded-full bg-surface-container-high"
          />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-40 rounded-[2rem] border-2 border-candy-pink/20 bg-surface-container-low/60"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Everything that needs the database.
 *
 * Split out from the page so it can sit behind a Suspense boundary: the
 * heading and the studio chrome paint immediately, and this streams in when
 * the query returns. On a slow link that is the difference between a blank
 * page for half a second and a page that is simply still filling in.
 */
async function OrderList({ active }: { active: FilterKey }) {
  // One query for every order, filtered here rather than in the database: the
  // chips carry counts, so all four groups are needed on every render anyway.
  const orders = await getAdminOrders();
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, orders.filter((o) => matches(f.key, o.status)).length]),
  ) as Record<FilterKey, number>;

  const shown = orders.filter((o) => matches(active, o.status));
  const emptyMessage = FILTERS.find((f) => f.key === active)!.empty;

  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-4">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
        {counts.pending > 0 ? ` · ${counts.pending} waiting on you` : ""}
      </p>

      <nav aria-label="Filter orders" className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const on = f.key === active;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/orders" : `/admin/orders?status=${f.key}`}
              aria-current={on ? "page" : undefined}
              className={
                on
                  ? "rounded-full bg-primary text-on-primary font-headline-md px-4 py-2 text-body-md"
                  : "rounded-full border-2 border-outline-variant px-4 py-2 text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
              }
            >
              {f.label}
              <span className={on ? "ml-2 opacity-80" : "ml-2 text-outline"}>
                {counts[f.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-outline-variant bg-surface-container-low/60 p-10 text-center">
          <Icon name="receipt_long" className="text-[40px] text-outline" />
          <p className="text-body-md text-on-surface-variant mt-3">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((o) => {
            const address = formatAddress(o.address);
            const allPrepared = o.lines.every((l) => l.prepared);
            return (
              <article
                key={o.id}
                className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary leading-tight">
                      #{o.orderNumber}
                      {o.customerName ? (
                        <span className="text-on-surface"> · {o.customerName}</span>
                      ) : null}
                    </h2>
                    <p className="text-[13px] text-on-surface-variant">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {CHANNEL_LABEL[o.channel]}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-body-md capitalize ${STATUS_TONE[o.status]}`}
                  >
                    {o.status}
                  </span>
                </div>

                {(o.contactPhone || address || o.contactEmail) && (
                  <div className="text-body-md text-on-surface-variant mb-3 space-y-0.5">
                    {o.contactPhone && (
                      <p>
                        <a
                          href={`https://wa.me/${o.contactPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {o.contactPhone}
                        </a>
                      </p>
                    )}
                    {address && <p>{address}</p>}
                    {o.contactEmail && <p>{o.contactEmail}</p>}
                  </div>
                )}

                <ul className="border-t border-outline-variant/60 pt-3 space-y-1 mb-3">
                  {o.lines.map((l) => {
                    // Stock can fall between an order arriving and being
                    // confirmed — another order may have taken the last one.
                    const short =
                      o.stockDeductedAt === null &&
                      l.stockCount !== null &&
                      l.quantity > l.stockCount;
                    return (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 text-body-md"
                      >
                        {/* Studio bookkeeping, not a customer-facing part of
                            the order — see PreparedToggle. Shown only once an
                            order is paid: preparing something nobody has
                            confirmed buying is premature, and ticking boxes on
                            a cancelled order is just confusing. A fixed-size
                            spacer stands in for the other statuses so the
                            product name still lines up down the list rather
                            than shifting left whenever the toggle disappears. */}
                        {o.status === "paid" ? (
                          <PreparedToggle itemId={l.id} prepared={l.prepared} />
                        ) : (
                          <span className="w-6 h-6 shrink-0" aria-hidden />
                        )}
                        <span className="flex-1 text-on-surface">
                          {l.quantity} × {l.productName}
                          {short && (
                            <span className="text-error">
                              {" "}
                              — only {l.stockCount} in stock ⚠
                            </span>
                          )}
                        </span>
                        <span className="text-on-surface-variant whitespace-nowrap">
                          {formatPrice(l.unitPriceCents * l.quantity, o.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 pt-3">
                  <span className="font-headline-md text-body-lg text-primary">
                    {formatPrice(o.totalCents, o.currency)}
                    {o.stockDeductedAt && (
                      <span className="ml-2 text-[13px] font-normal text-on-surface-variant">
                        stock deducted
                      </span>
                    )}
                  </span>
                  <OrderActions
                    orderId={o.id}
                    orderNumber={o.orderNumber}
                    actions={nextActions(o.status, allPrepared)}
                    stockDeducted={o.stockDeductedAt !== null}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawFilter } = await searchParams;
  const active = parseFilter(rawFilter);

  return (
    <>
      <h1 className="font-headline-md text-headline-lg text-primary mb-1">
        Orders
      </h1>

      {/* keyed on the filter so switching chips shows the skeleton again
          rather than leaving the previous list on screen looking live */}
      <Suspense key={active} fallback={<OrdersSkeleton />}>
        <OrderList active={active} />
      </Suspense>
    </>
  );
}
