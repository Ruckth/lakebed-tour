import { expect, test } from "@playwright/test";

test("home presents Lakebed as the first viewport experience", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Lakebed \[alpha\]/ })).toBeVisible();
  await expect(page.getByText("Let agents build small full-stack TypeScript apps")).toBeVisible();
  await expect(page.getByText("npx lakebed new")).toBeVisible();
  await expect(page.getByRole("link", { name: /Read docs/i })).toHaveAttribute(
    "href",
    "https://docs.lakebed.dev/",
  );
  await expect(page.getByRole("heading", { name: "One directory is the whole app." })).toBeVisible();
  await expect(page.getByText("Reserve your villa")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Demo website only" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open concierge chat" })).toHaveCount(0);
});

test("mobile navigation exposes Lakebed sections without layout overlap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Lakebed \[alpha\]/ })).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(page.getByRole("link", { name: "Capsule", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Workflow", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Docs" }).last()).toHaveAttribute(
    "href",
    "https://docs.lakebed.dev/",
  );
});

test("legacy resort routes redirect home", async ({ page }) => {
  for (const path of [
    "/booking",
    "/booking/pay?bookingId=demo",
    "/booking/success?bookingId=demo",
    "/chat?property=pool-villa",
    "/rooms/pool-villa",
    "/th/booking",
    "/th/chat",
    "/th/rooms/pool-villa",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL((url) => url.pathname === "/" || url.pathname === "/th");
    await expect(page.getByRole("heading", { name: /Lakebed \[alpha\]/ })).toBeVisible();
  }
});
