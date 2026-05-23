import { expect, test } from "@playwright/test";
import { bypassDemoDisclaimer } from "./demo-disclaimer";

test.beforeEach(async ({ page }) => {
  await bypassDemoDisclaimer(page);
});

test("villa detail page renders gallery, 360 entry, and chat trigger", async ({ page }) => {
  await page.goto("/rooms/pool-villa");

  await expect(page.getByRole("heading", { name: "Pool Villa" })).toBeVisible();
  await expect(page.getByText("Private paradise with infinity pool")).toBeVisible();
  await expect(page.getByRole("button", { name: /Explore 360|Explore in 360/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Open concierge chat" })).toBeVisible();
});
