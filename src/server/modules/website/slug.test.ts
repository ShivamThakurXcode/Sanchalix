import { describe, expect, it } from "vitest";
import { defaultSlug, isUsableSlug } from "./slug";

describe("school slug", () => {
  it("accepts a normal name and rejects bad shapes", () => {
    expect(isUsableSlug("dps-bhopal")).toBe(true);
    for (const bad of [
      "ab",
      "Has-Caps",
      "-lead",
      "trail-",
      "has space",
      "a".repeat(31),
    ])
      expect(isUsableSlug(bad)).toBe(false);
  });

  it("keeps platform subdomains for the platform", () => {
    expect(isUsableSlug("www")).toBe(false);
    expect(defaultSlug("API")).toBeUndefined();
    expect(defaultSlug("VWN")).toBe("vwn");
  });
});
