import { test, expect } from "@playwright/test";

/**
 * Browsing, searching, and the empty states.
 *
 * Nothing here writes to the database, so these are the tests that stay honest
 * no matter how often they run.
 */

test("every public page loads", async ({ page }) => {
  for (const path of ["/", "/shop", "/cart", "/about", "/refund-policy", "/login", "/signup"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should not error`).toBeLessThan(400);
  }
});

test("the shop lists products with rupee prices", async ({ page }) => {
  await page.goto("/shop");

  const cards = page.locator('button[aria-label^="Add "][aria-label$="to cart"]');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);

  // Prices must render through formatPrice — a raw paise integer on screen
  // would mean the currency formatting broke.
  await expect(page.getByText(/₹\d/).first()).toBeVisible();

  // Scoped to <main>, not the whole page. This scanned everything until the
  // footer arrived on this page and its "© 2024 Art Speaks" tripped a check
  // meant to catch unformatted prices. A year is not a price, and neither is a
  // phone number — the assertion belongs where prices actually render.
  await expect(
    page.locator("main").getByText(/\b\d{4,}\b(?!\s*left)/),
  ).toHaveCount(0);
});

test("search finds a product by partial name", async ({ page }) => {
  await page.goto("/shop?q=bow");
  // The heading wraps the term in curly quotes, so match the word not the quoting.
  await expect(page.getByRole("heading", { name: /bow/ })).toBeVisible();
  await expect(page.getByText(/Heart Bow Pin/)).toBeVisible();
});

test("search tolerates a typo", async ({ page }) => {
  // Exercises the pg_trgm fallback from migration 0008. Substring matching
  // alone would return nothing for this.
  await page.goto("/shop?q=strawbery");
  await expect(page.getByText(/Strawberry Pin/)).toBeVisible();
});

test("a search that matches nothing says so", async ({ page }) => {
  await page.goto("/shop?q=zzzznothing");
  await expect(page.getByText(/Nothing matched/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /browse everything/i })).toBeVisible();
});

test("clearing the search returns to the full collection", async ({ page }) => {
  await page.goto("/shop?q=bow");
  await page.getByRole("link", { name: /clear search/i }).click();
  await expect(page).toHaveURL(/\/shop$/);
});

test("the wishlist prompts a signed-out visitor to sign in", async ({ page }) => {
  await page.goto("/shop?collection=wishlist");
  await expect(page.getByText(/sign in to see the pieces/i)).toBeVisible();
  // The link must carry ?next=, or signing in drops them on the homepage
  // rather than back at their saved pieces.
  await expect(
    page.locator('a[href*="/login?next="]').first(),
  ).toBeVisible();
});

test("an empty basket says what to do about it", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText(/basket is empty/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /browse the shop/i })).toBeVisible();
});

test("a product has a page of its own", async ({ page }) => {
  await page.goto("/shop/heart-bow-pin");
  await expect(page.getByRole("heading", { name: /heart bow pin/i })).toBeVisible();
  await expect(page.getByText(/₹\d/).first()).toBeVisible();
});

test("an unknown product slug is a 404, not an empty page", async ({ page }) => {
  const res = await page.goto("/shop/no-such-piece");
  expect(res?.status()).toBe(404);
  await expect(page.getByText(/can.t find that one/i)).toBeVisible();
});

test("an unknown collection slug is a 404, not the whole catalogue", async ({ page }) => {
  // Falling back to every product made /shop?collection=<anything> a 200
  // duplicate of /shop — an unbounded set of URLs serving identical content.
  const res = await page.goto("/shop?collection=not-a-real-category");
  expect(res?.status()).toBe(404);
});
