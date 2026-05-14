import path from "path";

let _cachedProps = null;

/**
 * Configuration class to manage application-wide settings and environment variables.
 */
class Config {
  /**
   * Returns the base directory of the application.
   * @returns {string} The current working directory.
   */
  static dirname() {
    return process.cwd();
  }

  /**
   * Retrieves application properties from environment variables or default values.
   * Results are cached after first call for performance.
   * @returns {{debug: boolean, descriptionMeta: string, keywordsMeta: string, titleMeta: string, authorMeta: string, description: string, title: string, version: string, langMeta: string, host: string, appUrl: string, port: number, static: {path: string, options: Object}}} The configuration properties object.
   * @example
   * const props = Config.props();
   * console.log(props);
   */
  static props() {
    if (_cachedProps) return _cachedProps;

    const portRaw = parseInt(process.env.PORT);

    _cachedProps = {
      debug: process.env.DEBUG === "true",
      descriptionMeta: process.env.DESCRIPTION_META || "",
      keywordsMeta: process.env.KEYWORDS_META || "",
      titleMeta: process.env.TITLE_META || "",
      authorMeta: process.env.AUTHOR_META || "",
      description: process.env.DESCRIPTION || "",
      title: process.env.TITLE || "",
      version: process.env.VERSION || "1.0.0",
      langMeta: process.env.LANGMETA || "en",
      host: process.env.HOST || "http://localhost",
      appUrl: process.env.APP_URL || process.env.HOST || "http://localhost",
      port: Number.isNaN(portRaw) ? 3000 : portRaw,
      jwtSecret: process.env.JWT_SECRET,
      static: {
        path: process.env.STATIC_PATH || "frontend/public",
        options: {},
      },
    };
    return _cachedProps;
  }
}
export default Config;
