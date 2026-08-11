import Link from "next/link";
import { getSalesSummary } from "@/lib/data/admin";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { SalesChart } from "@/components/admin/sales-chart";

export const metadata = { title: "Art Speaks | Sales" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-5">
      <p className="text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1">
        {label}
      </p>
      <p className="font-headline-md text-headline-lg text-primary leading-none">
        {value}
      </p>
    </div>
  );
}

export default async function SalesPage() {
  const {
    months,
    bestSellers,
    totalRevenueCents,
    totalOrders,
    totalUnits,
    channels,
  } = await getSalesSummary();

  const topUnits = Math.max(...bestSellers.map((b) => b.units), 1);

  return (
    <>
      <h1 className="font-headline-md text-headline-lg text-primary mb-1">
        Sales
      </h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        Counts orders marked paid, shipped or delivered — not ones still
        waiting.
      </p>

      {totalOrders === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-outline-variant bg-surface-container-low/60 p-10 text-center">
          <Icon name="monitoring" className="text-[40px] text-outline" />
          <p className="text-body-md text-on-surface-variant mt-3">
            Nothing sold yet. Record a sale or mark an order paid and it appears
            here.
          </p>
          <Link
            href="/admin/sales/new"
            className="inline-block mt-4 text-primary font-label-caps text-label-caps uppercase tracking-wider hover:underline"
          >
            Record a sale
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* With only a handful of orders the honest headline is a number, not
              a chart. These stay useful once the chart has something to say. */}
          <div className="grid sm:grid-cols-3 gap-gutter">
            <Stat label="Revenue" value={formatPrice(totalRevenueCents)} />
            <Stat label="Orders" value={String(totalOrders)} />
            <Stat label="Pieces sold" value={String(totalUnits)} />
          </div>

          <section>
            <h2 className="font-headline-md text-headline-md text-primary mb-1">
              Revenue by month
            </h2>
            <p className="text-body-md text-on-surface-variant mb-4">
              {months.length === 1
                ? "One month so far — this becomes a trend as the months add up."
                : `${months.length} months`}
            </p>
            <div className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6">
              <SalesChart months={months} channels={channels} />
            </div>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-primary mb-1">
              What actually sells
            </h2>
            <p className="text-body-md text-on-surface-variant mb-4">
              Ranked by units sold. This is the record of what happened — the
              Featured toggle in Inventory is your choice about what to show.
            </p>
            <div className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6 space-y-3">
              {bestSellers.map((b) => (
                <div key={b.key}>
                  <div className="flex justify-between gap-3 text-body-md mb-1">
                    <span className="text-on-surface">{b.name}</span>
                    <span className="text-on-surface-variant whitespace-nowrap">
                      {b.units} {b.units === 1 ? "piece" : "pieces"} ·{" "}
                      {formatPrice(b.revenueCents)}
                    </span>
                  </div>
                  {/* One measure, one hue — magnitude, not identity. */}
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(b.units / topUnits) * 100}%`,
                        background: "#1E6FBF",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* The figures in plain form, so nothing here depends on reading a chart. */}
          <details className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6">
            <summary className="cursor-pointer font-headline-md text-body-lg text-primary">
              See the figures as a table
            </summary>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse min-w-[28rem]">
                <thead>
                  <tr className="text-on-surface-variant">
                    <th className="font-label-caps text-label-caps uppercase tracking-wide py-2">
                      Month
                    </th>
                    {channels.map((c) => (
                      <th
                        key={c}
                        className="font-label-caps text-label-caps uppercase tracking-wide py-2 text-right capitalize"
                      >
                        {c}
                      </th>
                    ))}
                    <th className="font-label-caps text-label-caps uppercase tracking-wide py-2 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr
                      key={m.month}
                      className="border-t border-outline-variant/60"
                    >
                      <td className="py-2 text-body-md text-on-surface">
                        {m.month}
                      </td>
                      {channels.map((c) => (
                        <td
                          key={c}
                          className="py-2 text-body-md text-on-surface-variant text-right"
                        >
                          {m.byChannel[c] ? formatPrice(m.byChannel[c]) : "—"}
                        </td>
                      ))}
                      <td className="py-2 text-body-md text-on-surface text-right">
                        {formatPrice(m.revenueCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </>
  );
}
