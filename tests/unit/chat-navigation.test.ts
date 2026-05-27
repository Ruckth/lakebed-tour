import { describe, expect, it } from "vitest";
import {
  buildChatHref,
  getPathWithSearch,
  getSafeChatReturnTo,
} from "@/lib/chat/navigation";

describe("chat navigation helpers", () => {
  it("builds localized chat links with return targets", () => {
    expect(buildChatHref({ locale: "en", pathname: "/", search: "" })).toBe(
      "/chat?returnTo=%2F",
    );
    expect(buildChatHref({ locale: "th", pathname: "/th", search: "" })).toBe(
      "/th/chat?returnTo=%2Fth",
    );
    expect(
      buildChatHref({
        locale: "en",
        pathname: "/rooms/pool-villa",
        propertySlug: "pool-villa",
        search: "tour=1",
      }),
    ).toBe("/chat?property=pool-villa&returnTo=%2Frooms%2Fpool-villa%3Ftour%3D1");
  });

  it("does not add a self-return on chat pages", () => {
    expect(
      buildChatHref({
        locale: "th",
        pathname: "/th/chat",
        propertySlug: "pool-villa",
        search: "returnTo=%2Fth",
      }),
    ).toBe("/th/chat?property=pool-villa");
  });

  it("normalizes paths and validates return targets", () => {
    expect(getPathWithSearch("/booking", "?unit=garden-suite")).toBe(
      "/booking?unit=garden-suite",
    );
    expect(getSafeChatReturnTo("/rooms/pool-villa?tour=1#gallery")).toBe(
      "/rooms/pool-villa?tour=1#gallery",
    );
    expect(getSafeChatReturnTo("/th/chat?returnTo=%2Fth")).toBeNull();
    expect(getSafeChatReturnTo("//evil.test/path")).toBeNull();
    expect(getSafeChatReturnTo("https://evil.test/path")).toBeNull();
  });
});
