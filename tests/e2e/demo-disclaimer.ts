import type { Page } from "@playwright/test";

export const DEMO_DISCLAIMER_STORAGE_KEY = "seaview-demo-disclaimer-dismissed";

export async function bypassDemoDisclaimer(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, DEMO_DISCLAIMER_STORAGE_KEY);
}
