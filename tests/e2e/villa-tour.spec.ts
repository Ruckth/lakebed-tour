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

test("mobile villa chat trigger targets the property chat page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/rooms/pool-villa");

  const chatLink = page.getByRole("link", { name: "Open concierge chat" });
  await expect(chatLink).toBeVisible();
  await expect(chatLink).toHaveAttribute("href", "/chat?property=pool-villa");

  await page.goto("/chat?property=pool-villa");
  await expect(page).toHaveURL((url) => {
    expect(url.pathname).toBe("/chat");
    expect(url.searchParams.get("property")).toBe("pool-villa");
    return true;
  });
  await expect(page.getByRole("button", { name: /Restart chat - Pool Villa concierge/i })).toBeVisible();
});
