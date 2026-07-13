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
