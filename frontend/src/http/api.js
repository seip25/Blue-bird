const defaultPort = (import.meta.env.PORT || "3000").replace(
  /^["']|["']$/g,
  "",
);
const host = (import.meta.env.HOST || "localhost").replace(/^["']|["']$/g, "");

/**
 * Builds an absolute API URL for server-side fetch calls.
 *
 * @param {string} [path] - API path relative to the server root (e.g. "api/users").
 * @param {URL} [requestUrl] - Current request URL (pass `Astro.url` from the page). Required in production.
 * @returns {string} Absolute URL ready for fetch.
 * @example apiUrl('api/', Astro.url)
 */
export function apiUrl(path = "", requestUrl) {
  if (!requestUrl) {
    throw new Error(
      "apiUrl: requestUrl is required in production (pass Astro.url)",
    );
  }
  const url = new URL(`/${path}`, requestUrl);
  const runtimePort =
    (typeof process !== "undefined" && process.env && process.env.PORT) ||
    defaultPort;
  url.hostname = "127.0.0.1";
  url.port = runtimePort;
  url.protocol = "http:";
  return url.href;
}
