import { IEvent } from "../models/Event";
import { env } from "../config/env";

export function buildShareLinks(event: IEvent) {
  // CLIENT_URL is the frontend's base URL, once one exists - falls back to
  // an API-only link so this still works before there's a UI to point to
  const base = env.CLIENT_URL !== "*" ? env.CLIENT_URL : "";
  const eventUrl = `${base}/events/${event._id.toString()}`;

  const title = event.title;
  const text = `Check out "${event.title}" on Eventful - ${event.venue}, ${new Date(event.startDate).toDateString()}`;

  const encodedUrl = encodeURIComponent(eventUrl);
  const encodedText = encodeURIComponent(text);

  return {
    url: eventUrl,
    title,
    text,
    platforms: {
      whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
  };
}
