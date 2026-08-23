import { defineConfig } from "@playwright/test";

// The suite talks to the local Supabase stack directly (the reset helper needs
// the service_role key), and Playwright does not read .env.local the way Next
// does. process.loadEnvFile is stdlib -- no dotenv dependency for two files.
//
// .env.local FIRST, deliberately: loadEnvFile does not overwrite a variable
// that is already set, and .env holds the *remote* project's URL. The reverse
// order silently points the whole suite at production.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Absent is fine; the helper fails loudly if the keys are actually missing.
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // One seeded test user, truncated between tests -- parallel workers would
  // wipe each other's data.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // Next dev cold-starts well past 30s alongside the Supabase stack.
    timeout: 120_000,
  },
});
