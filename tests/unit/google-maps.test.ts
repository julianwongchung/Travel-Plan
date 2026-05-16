import { describe, expect, it } from "vitest";
import { generateGoogleMapsLink } from "@/lib/utils/google-maps";

describe("google maps helper", () => {
  it("generates a Google Maps search link from name and area", () => {
    expect(generateGoogleMapsLink("Han Market", "Da Nang")).toBe("https://www.google.com/maps/search/?api=1&query=Han%20Market%20Da%20Nang");
  });
});
