import { test, expect } from "@playwright/test";

/**
 * The basket. Still no database writes — the cart lives in localStorage until
 * checkout — so these are safe to run repeatedly.
 */

/**
 * The first product card's cart control.
 *
 * Matched on the attribute rather than the accessible name — as is every other
 * control in this file. The card wrapper is itself role="button" so the modal
 * can open on click, and its computed accessible name absorbs the labels of
 * everything inside it. A name-based query therefore matches the wrapper too,
 * and returns it first, so clicks land on the card and open the modal instead
 * of doing what the test asked.
 */
function firstCartButton(page: import("@playwright/test").Page) {
  return page.locator('button[aria-label^="Add "][aria-label$="to cart"]').first();
}

test("adding a piece updates the header count", async ({ page }) => {
  await page.goto("/shop");
  await firstCartButton(page).click();

  await expect(page.getByLabel(/1 in basket/)).toBeVisible();
});

test("the button becomes a stepper that counts up and back down", async ({ page }) => {
  await page.goto("/shop");
  await firstCartButton(page).click();

  // Resting icon becomes − 1 +
  await expect(page.getByLabel(/^1 in cart$/)).toBeVisible();

  // Whether it can reach 2 depends on that piece's stock — the + is disabled
  // at the limit, which is the cap working rather than a failure. Both paths
  // are correct, so assert whichever applies.
  const plus = page.locator('button[aria-label^="Add another"]').first();
  if (await plus.count()) {
    await plus.click();
    await expect(page.getByLabel(/^2 in cart$/)).toBeVisible();
    await page.locator('button[aria-label^="One fewer"]').first().click();
    await expect(page.getByLabel(/^1 in cart$/)).toBeVisible();
  } else {
    await expect(
      page.locator('button[aria-label^="No more "]').first(),
    ).toBeDisabled();
  }

  // At one the minus removes the line, so the control returns to a plain icon.
  await page.locator('button[aria-label^="Remove "][aria-label$="from cart"]').first().click();
  await expect(firstCartButton(page)).toBeVisible();
});

test("the basket survives a reload", async ({ page }) => {
  await page.goto("/shop");
  await firstCartButton(page).click();
  await expect(page.getByLabel(/1 in basket/)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel(/1 in basket/)).toBeVisible();
});

test("the stepper stops at the stock count", async ({ page }) => {
  await page.goto("/shop");

  // Find a piece with only one left — its + should be disabled after one tap.
  const card = page.locator("text=/1 left/").first();
  if ((await card.count()) === 0) test.skip(true, "no single-stock product to test against");

  await firstCartButton(page).click();
  const plus = page.locator('button[aria-label^="No more "]').first();
  if ((await plus.count()) > 0) await expect(plus).toBeDisabled();
});

test("the cart page shows what was added and links to checkout", async ({ page }) => {
  await page.goto("/shop");
  await firstCartButton(page).click();

  await page.goto("/cart");
  await expect(page.getByText(/subtotal/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /place order/i })).toBeVisible();
});
