const port = (import.meta.env.PORT || "3000").replace(/^["']|["']$/g, "");
const host = (import.meta.env.HOST || "localhost").replace(/^["']|["']$/g, "");

/**
 * Builds an absolute API URL for server-side fetch calls.
 *
 * @param {string} [path] - API path relative to the server root (e.g. "api/users").
 * @param {URL} [requestUrl] - Current request URL (pass `Astro.url` from the page). Required in production.
 * @returns {string} Absolute URL ready for fetch.
 */
export function apiUrl(path = "", requestUrl) {
  if (import.meta.env.DEV) {
    return `http://${host}:${port}/${path}`;
  }
  if (!requestUrl) {
    throw new Error("apiUrl: requestUrl is required in production (pass Astro.url)");
  }
  const url = new URL(`/${path}`, requestUrl);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    url.port = port;
  }
  return url.href;
}
