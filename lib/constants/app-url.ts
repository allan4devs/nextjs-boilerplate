export const DEFAULT_APP_URL = "https://www.xtremecr.com";

function normalizeUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

const configuredUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  DEFAULT_APP_URL
).trim();

export const APP_URL = normalizeUrl(configuredUrl || DEFAULT_APP_URL);

export function absoluteAppUrl(path: string) {
  return new URL(path, `${APP_URL}/`).toString();
}

/**
 * Keep magic links in the same environment that persisted their token.
 * Production always uses the canonical public domain; local development and
 * Vercel previews use their own runtime URL so they do not validate against a
 * different Mongo database.
 */
export function requestAppUrl(requestUrl: string) {
  if (process.env.VERCEL_ENV === "production") return APP_URL;

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return normalizeUrl(process.env.VERCEL_URL);
  }

  if (process.env.NODE_ENV === "development") {
    try {
      return normalizeUrl(new URL(requestUrl).origin);
    } catch {
      return APP_URL;
    }
  }

  return APP_URL;
}

export function absoluteRequestUrl(path: string, baseUrl?: string) {
  return new URL(path, `${normalizeUrl(baseUrl || APP_URL)}/`).toString();
}
