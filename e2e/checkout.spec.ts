import { test, expect } from "@playwright/test";

/**
 * Placing an order.
 *
 * These WRITE to the database — every run leaves a pending order behind. That
 * is why the whole suite points at a separate Supabase project; against the
 * live one this would fill the orders page with test rows.
 *
 * Stock is not touched: an order is created pending, and only marking it paid
 * deducts. That happens in admin.spec.ts.
 */

test("an order can be placed and hands off to WhatsApp", async ({ page }) => {
  await page.goto("/shop");
  await page.locator('button[aria-label^="Add "][aria-label$="to cart"]').first().click();

  await page.goto("/checkout");

  await page.getByLabel("Name").fill("Playwright Test");
  await page.getByLabel(/whatsapp number/i).fill("9000000000");
  await page.getByLabel("Address", { exact: true }).fill("1 Test Road");
  await page.getByLabel("City").fill("Kolkata");
  await page.getByLabel("State").fill("West Bengal");
  await page.getByLabel("Pincode").fill("700001");

  await page.getByRole("button", { name: /place order/i }).click();

  // Confirmation carries the order number the database assigned.
  await expect(page.getByText(/order #\d+ received/i)).toBeVisible({ timeout: 15_000 });

  // The handoff link must reach WhatsApp with the order pre-filled — this is
  // the only thing telling the studio an order arrived.
  const link = page.getByRole("link", { name: /send on whatsapp/i });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toContain("whatsapp.com");
  // The studio distinguishes an order from a custom-order enquiry by this
  // prefix, so assert the prefix, not merely that a number appears.
  expect(decodeURIComponent(href ?? "")).toMatch(/^[\s\S]*Order: #\d+/);
});

test("the basket is emptied once the order is recorded", async ({ page }) => {
  await page.goto("/shop");
  await page.locator('button[aria-label^="Add "][aria-label$="to cart"]').first().click();
  await page.goto("/checkout");

  await page.getByLabel("Name").fill("Playwright Test");
  await page.getByLabel(/whatsapp number/i).fill("9000000000");
  await page.getByLabel("Address", { exact: true }).fill("1 Test Road");
  await page.getByLabel("City").fill("Kolkata");
  await page.getByLabel("State").fill("West Bengal");
  await page.getByLabel("Pincode").fill("700001");
  await page.getByRole("button", { name: /place order/i }).click();
  await expect(page.getByText(/order #\d+ received/i)).toBeVisible({ timeout: 15_000 });

  // Leaving it full would let a refresh place the same order twice.
  await page.goto("/cart");
  await expect(page.getByText(/basket is empty/i)).toBeVisible();
});

test("checkout with an empty basket offers the shop instead of a form", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText(/nothing in your basket/i)).toBeVisible();
});
