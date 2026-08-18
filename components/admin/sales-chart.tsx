"use client";

import { useState } from "react";
import { formatPrice, formatMonth } from "@/lib/types";
import type { MonthlySales } from "@/lib/data/admin";

/**
 * Channel colours.
 *
 * Not taken from the storefront palette: those pastels sit below the chroma
 * floor and read as grey once they become small marks, and the three brand
 * hues scored a colour-blind separation of 2.6 against each other — effectively
 * one colour to a deuteranopic reader.
 *
 * These three were validated instead: worst adjacent CVD ΔE 19.5, normal-vision
 * 21.9, passing in both light and dark. Assigned in fixed order per channel, so
 * a channel keeps its colour no matter which others appear.
 */
export const CHANNEL_COLOR: Record<string, string> = {
  offline: "#1E6FBF",
  whatsapp: "#D97706",
  online: "#B5306E",
};
const CHANNEL_LABEL: Record<string, string> = {
  offline: "In person",
  whatsapp: "WhatsApp",
  online: "Online",
};

export function SalesChart({
  months,
  channels,
}: {
  months: MonthlySales[];
  channels: string[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...months.map((m) => m.revenueCents), 1);

  return (
    <div>
      {/* A legend is always present for two or more series, so identity is
          never carried by colour alone. */}
      {channels.length > 1 && (
        <div className="flex flex-wrap gap-4 mb-5">
          {channels.map((c) => (
            <span
              key={c}
              className="flex items-center gap-2 text-body-md text-on-surface-variant"
            >
              <span
                aria-hidden="true"
                className="w-3 h-3 rounded-sm"
                style={{ background: CHANNEL_COLOR[c] ?? "#1E6FBF" }}
              />
              {CHANNEL_LABEL[c] ?? c}
            </span>
          ))}
        </div>
      )}

      {/* items-stretch (the default), not items-end. Under items-end each
          column shrinks to its text, so the bar container's flex-1 had no
          space to grow into and every bar resolved to a percentage of zero —
          labels rendered, bars did not. The columns must fill the row's height
          for the bars to have anything to be a fraction of. */}
      <div className="flex gap-3 h-56 overflow-x-auto pb-1">
        {months.map((m) => {
          const heightPct = (m.revenueCents / max) * 100;
          const isHover = hover === m.month;
          return (
            <div
              key={m.month}
              className="flex h-full flex-col items-center justify-end gap-2 min-w-14 flex-1"
              onMouseEnter={() => setHover(m.month)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className={`text-[12px] whitespace-nowrap transition-opacity ${
                  isHover ? "text-primary opacity-100" : "text-on-surface-variant opacity-70"
                }`}
              >
                {formatPrice(m.revenueCents)}
              </span>

              <div className="w-full flex-1 flex flex-col justify-end">
                <div
                  className="w-full flex flex-col-reverse gap-0.5"
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                  title={channels
                    .filter((c) => m.byChannel[c])
                    .map((c) => `${CHANNEL_LABEL[c] ?? c}: ${formatPrice(m.byChannel[c])}`)
                    .join(" · ")}
                >
                  {channels
                    .filter((c) => m.byChannel[c])
                    .map((c, i, arr) => (
                      <div
                        key={c}
                        // 4px rounded end on the topmost segment only, so the
                        // stack reads as one bar anchored to the baseline.
                        className={i === arr.length - 1 ? "rounded-t" : ""}
                        style={{
                          background: CHANNEL_COLOR[c] ?? "#1E6FBF",
                          height: `${(m.byChannel[c] / m.revenueCents) * 100}%`,
                          opacity: hover && !isHover ? 0.45 : 1,
                          transition: "opacity .15s",
                        }}
                      />
                    ))}
                </div>
              </div>

              <span className="text-[12px] text-on-surface-variant whitespace-nowrap">
                {formatMonth(m.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
