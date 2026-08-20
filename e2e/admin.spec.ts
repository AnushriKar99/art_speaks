import { test, expect } from "@playwright/test";

/**
 * The studio side.
 *
 * These sign in as a real admin on the TEST project and move real stock —
 * recording a sale and marking an order paid both deduct. Never point this at
 * the live project.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(admin|)$/, { timeout: 15_000 });
}

test.describe("guard", () => {
  test("every admin page bounces a signed-out visitor to login", async ({ page }) => {
    for (const path of [
      "/admin",
      "/admin/inventory",
      "/admin/inventory/new",
      "/admin/sales",
      "/admin/sales/new",
      "/admin/orders",
    ]) {
      await page.goto(path);
      // Landing anywhere other than /login would mean the guard let them past.
      await expect(page, `${path} should require signing in`).toHaveURL(/\/login/);
    }
  });
});

test.describe("signed in", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.test",
  );

  test("an admin can sign in and reach the dashboard", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
  });

  test("inventory lists products with rupee prices", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: /^inventory$/i })).toBeVisible();
    await expect(page.getByText(/₹\d/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /add product/i })).toBeVisible();
  });

  test("recording an in-person sale deducts stock", async ({ page }) => {
    await signIn(page);

    await page.goto("/admin/sales/new");
    // Must be an ENABLED tile: a sold-out piece renders disabled, and clicking
    // it does nothing — which reads as "stock did not change" and fails the
    // test for the wrong reason. Repeated runs exhaust stock, so this matters.
    const tile = page.locator("button[aria-label^='Add ']:not([disabled])").first();
    if ((await tile.count()) === 0) {
      test.skip(true, "every piece is out of stock in the test project");
    }

    // Which piece this is has to be carried through to the assertion.
    //
    // This used to read row 1 of the inventory table before and after, and
    // assert it changed — but row 1 is the newest product, which is not
    // necessarily the one sold here. Once repeated runs drained that product
    // to zero its tile became disabled, so the sale landed on a different
    // piece and row 1 correctly did not move. The test then failed forever,
    // reporting a stock bug that did not exist.
    // The tile's label is `Add ${name}` (offline-sale-form.tsx) — a sold-out
    // one reads `${name} — none in stock` instead, and is disabled, so the
    // selector above never picks it.
    const label = await tile.getAttribute("aria-label");
    const soldName = label!.replace(/^Add /, "").trim();

    const rowFor = () =>
      page.locator("tbody tr").filter({ hasText: soldName }).first();

    await page.goto("/admin/inventory");
    const before = await rowFor().innerText();

    await page.goto("/admin/sales/new");
    await page.locator(`button[aria-label="${label}"]`).click();
    await expect(page.getByText(/^1 item$/)).toBeVisible();
    await page.getByRole("button", { name: /save sale/i }).click();
    await expect(page.getByText(/sale recorded/i)).toBeVisible({ timeout: 15_000 });

    // The trigger from 0006 fires inside the same transaction, so the count
    // must already be lower by the time the page reloads.
    await page.goto("/admin/inventory");
    const after = await rowFor().innerText();
    expect(
      after,
      `stock for "${soldName}" should have changed after selling one`,
    ).not.toEqual(before);
  });

  test("an order can be marked paid", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/orders");

    const markPaid = page.getByRole("button", { name: /mark paid/i }).first();
    if ((await markPaid.count()) === 0) {
      test.skip(true, "no pending order — run checkout.spec.ts first");
    }

    await markPaid.click();
    // Marking paid is what deducts stock, so the card should say so afterwards.
    await expect(page.getByText(/stock deducted/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("the sales page reports revenue once something has sold", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/sales");
    await expect(page.getByRole("heading", { name: /^sales$/i })).toBeVisible();
    // Either figures, or an honest empty state — never a broken chart.
    const hasFigures = await page.getByText(/revenue/i).count();
    const isEmpty = await page.getByText(/nothing sold yet/i).count();
    expect(hasFigures + isEmpty).toBeGreaterThan(0);
  });
});
