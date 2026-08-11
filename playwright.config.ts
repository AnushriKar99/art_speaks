import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

/**
 * End-to-end tests run against a SEPARATE Supabase project, configured in
 * .env.test.
 *
 * That separation is not fastidiousness: these tests place real orders and
 * mark them paid, which deducts real stock. Pointed at the live project they
 * would take inventory to zero within a few runs and fill the orders page with
 * debris.
 *
 * .env.test is loaded before next dev starts below, so the server the browser
 * talks to is already reading the test database.
 */
loadEnv({ path: ".env.test", override: true });

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Tests share one database, and several of them move stock. Running in
  // parallel would let one test's sale change the counts another is asserting.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    // Only kept for failures — passing runs would otherwise fill the disk.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // A production build, not `next dev`, for two reasons:
    //
    //   Next refuses to run a second dev server from the same directory, so
    //   `next dev` here would fail whenever you already have one open.
    //
    //   NEXT_DIST_DIR keeps the build out of .next, which a running dev server
    //   is serving from — writing there strands it without its manifests and
    //   every route 500s until it is restarted.
    //
    // It also tests what actually ships rather than dev-mode output.
    command: `NEXT_DIST_DIR=.next-e2e next build && NEXT_DIST_DIR=.next-e2e next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    // Passed explicitly as well as inherited: these must be the test project's
    // credentials, and NEXT_PUBLIC_* values are baked into the client bundle at
    // build time, so getting this wrong would point the browser at live data.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
