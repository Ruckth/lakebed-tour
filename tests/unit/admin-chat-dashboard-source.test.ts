import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin chat dashboard source", () => {
  it("does not expose the old Fill Thai backfill action", () => {
    const dashboardSource = readFileSync(
      new URL("../../src/components/admin/AdminChatDashboard.tsx", import.meta.url),
      "utf8",
    );
    const suggestionsSource = readFileSync(
      new URL("../../convex/chatSuggestions.ts", import.meta.url),
      "utf8",
    );

    expect(dashboardSource).not.toContain("Fill Thai");
    expect(dashboardSource).not.toContain("backfill-thai");
    expect(dashboardSource).not.toContain("adminBackfillThaiGeneratedSuggestions");
    expect(suggestionsSource).not.toContain("adminBackfillThaiGeneratedSuggestions");
  });
});
