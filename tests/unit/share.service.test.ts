import { buildShareLinks } from "../../src/services/share.service";
import { IEvent } from "../../src/models/Event";

function fakeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    _id: { toString: () => "507f1f77bcf86cd799439099" },
    title: "Funk & Soul Night",
    venue: "Terra Kulture, Lagos",
    startDate: new Date("2026-12-25T19:00:00.000Z"),
    ...overrides,
  } as unknown as IEvent;
}

describe("share.service", () => {
  it("includes the event id in the canonical url", () => {
    expect(buildShareLinks(fakeEvent()).url).toContain("507f1f77bcf86cd799439099");
  });

  it("produces fully-encoded links for every platform", () => {
    const links = buildShareLinks(fakeEvent());
    const encodedUrl = encodeURIComponent(links.url);
    expect(links.platforms.x).toContain(`url=${encodedUrl}`);
    expect(links.platforms.facebook).toContain(`u=${encodedUrl}`);
    expect(links.platforms.whatsapp).toContain("https://api.whatsapp.com/send?text=");
  });

  it("never leaves a raw space in a generated link", () => {
    const links = buildShareLinks(fakeEvent({ title: "A Title With Spaces" }));
    for (const url of Object.values(links.platforms)) {
      expect(url).not.toContain(" ");
    }
  });

  it("doesn't throw when startDate is a string, not a Date instance - the cache-hit regression", () => {
    const withStringDate = fakeEvent({ startDate: "2026-12-25T19:00:00.000Z" as unknown as Date });
    expect(() => buildShareLinks(withStringDate)).not.toThrow();
  });
});
