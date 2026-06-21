import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassButton, GlassButtonLink } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { IOSListItem } from "@/components/ui/ios-list-item";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/form-fields";

describe("Liquid Glass UI primitives", () => {
  it("renders glass cards as readable content surfaces", () => {
    const markup = renderToStaticMarkup(createElement(GlassCard, null, "Trip details"));

    expect(markup).toContain("Trip details");
    expect(markup).toContain("rounded-[24px]");
    expect(markup).toContain("min-w-0");
    expect(markup).toContain("max-w-full");
  });

  it("supports button and link actions with the same pill treatment", () => {
    const buttonMarkup = renderToStaticMarkup(createElement(GlassButton, null, "Create trip"));
    const linkMarkup = renderToStaticMarkup(
      createElement(GlassButtonLink, { href: "/trips" }, "Open trips"),
    );

    expect(buttonMarkup).toContain("<button");
    expect(linkMarkup).toContain('href="/trips"');
    expect(buttonMarkup).toContain("rounded-full");
    expect(linkMarkup).toContain("rounded-full");
    expect(buttonMarkup).toContain("max-w-full");
    expect(buttonMarkup).toContain("whitespace-normal");
    expect(buttonMarkup).toContain("min-h-11");
    expect(buttonMarkup).toContain("px-3.5");
    expect(buttonMarkup).toContain("text-[13px]");
  });

  it("renders iOS list items with optional supporting content", () => {
    const markup = renderToStaticMarkup(
      createElement(IOSListItem, {
        title: "Da Nang Trip",
        description: "13/06/2026 to 17/06/2026",
        trailing: "Open",
      }),
    );

    expect(markup).toContain("Da Nang Trip");
    expect(markup).toContain("13/06/2026 to 17/06/2026");
    expect(markup).toContain("Open");
  });

  it("maps semantic statuses to accessible labels and tones", () => {
    const markup = renderToStaticMarkup(
      createElement(StatusBadge, { status: "completed" }),
    );

    expect(markup).toContain("Completed");
    expect(markup).toContain("success");
  });

  it("keeps page headers compact on mobile", () => {
    const markup = renderToStaticMarkup(
      createElement(IOSPageHeader, {
        title: "Da Nang Trip",
        description: "13/06/2026 to 17/06/2026",
      }),
    );

    expect(markup).toContain("text-[clamp(1.75rem,6vw,2.75rem)]");
    expect(markup).toContain("gap-3");
  });

  it("makes form controls shrink safely inside narrow cards", () => {
    const markup = renderToStaticMarkup(
      createElement(Input, { name: "destination", defaultValue: "A very long destination name" }),
    );

    expect(markup).toContain("w-full");
    expect(markup).toContain("min-w-0");
    expect(markup).toContain("max-w-full");
  });
});
