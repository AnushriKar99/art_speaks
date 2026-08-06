import { getAdminOrders, type AdminOrder } from "@/lib/data/admin";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { setOrderStatus } from "./actions";

export const metadata = { title: "Art Speaks | Orders" };

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

/** What you can sensibly do next, rather than every status at once. */
function nextActions(status: AdminOrder["status"]) {
  switch (status) {
    case "pending":
      return [
        { to: "paid", label: "Mark paid", primary: true },
        { to: "cancelled", label: "Cancel", primary: false },
      ];
    case "paid":
      return [{ to: "shipped", label: "Mark shipped", primary: true }];
    case "shipped":
      return [{ to: "delivered", label: "Mark delivered", primary: true }];
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

export default async function OrdersPage() {
  const orders = await getAdminOrders();
  const awaiting = orders.filter((o) => o.status === "pending").length;

  return (
    <>
      <h1 className="font-headline-md text-headline-lg text-primary mb-1">
        Orders
      </h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
        {awaiting > 0 ? ` · ${awaiting} waiting on you` : ""}
      </p>

      {orders.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-outline-variant bg-surface-container-low/60 p-10 text-center">
          <Icon name="receipt_long" className="text-[40px] text-outline" />
          <p className="text-body-md text-on-surface-variant mt-3">
            No orders yet. They appear here as soon as someone checks out.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const address = formatAddress(o.address);
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
                        className="flex justify-between gap-3 text-body-md"
                      >
                        <span className="text-on-surface">
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
                  <div className="flex flex-wrap gap-2">
                    {nextActions(o.status).map((a) => (
                      <form action={setOrderStatus} key={a.to}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="status" value={a.to} />
                        <button
                          type="submit"
                          className={
                            a.primary
                              ? "tactile-button rounded-2xl bg-primary text-on-primary font-headline-md px-4 py-2 text-body-md"
                              : "rounded-2xl border-2 border-outline-variant px-4 py-2 text-body-md text-on-surface-variant hover:border-error hover:text-error transition-colors"
                          }
                        >
                          {a.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
