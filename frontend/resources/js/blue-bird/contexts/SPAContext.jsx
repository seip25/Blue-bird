import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext";

const SPAContext = createContext({
  pageProps: {},
  pageMeta: {},
  loading: false,
  navigateToLang: () => { },
});

/**
 * SPAProvider — Bridges React Router navigation with backend SEO data.
 *
 * On every client-side route change, fetches meta/props from the backend
 * via ?source=frontend and updates document.title + meta tags.
 * Also syncs the language from URL prefixes (e.g., /es/about → lang="es").
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Array<string>} [props.languages=[]] - Supported language codes.
 * @param {string} [props.defaultLanguage="en"] - Default language.
 */
export function SPAProvider({
  children,
  languages = [],
  defaultLanguage = "en",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const [pageProps, setPageProps] = useState({});
  const [pageMeta, setPageMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);
  const abortRef = useRef(null);

  /**
   * Extracts language code from a URL path if it starts with a valid lang prefix.
   */
  const detectLangFromPath = useCallback(
    (pathname) => {
      if (!languages || languages.length === 0) return null;
      const parts = pathname.split("/").filter(Boolean);
      if (
        parts.length > 0 &&
        parts[0].length === 2 &&
        languages.includes(parts[0])
      ) {
        return parts[0];
      }
      return null;
    },
    [languages],
  );

  /**
   * Strips the language prefix from a path.
   */
  const stripLangPrefix = useCallback(
    (pathname) => {
      if (!languages || languages.length === 0) return pathname;
      const parts = pathname.split("/").filter(Boolean);
      if (
        parts.length > 0 &&
        parts[0].length === 2 &&
        languages.includes(parts[0])
      ) {
        const rest = parts.slice(1).join("/");
        return rest ? `/${rest}` : "/";
      }
      return pathname;
    },
    [languages],
  );

  /**
   * Localizes a path based on the current language.
   * If on /es/about, l("/") returns /es/
   */
  const l = useCallback(
    (path) => {
      if (!languages || languages.length === 0) return path;
      const currentLang = detectLangFromPath(location.pathname) || lang || defaultLanguage;
      if (!currentLang || currentLang === defaultLanguage) return path;

      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return `/${currentLang}${cleanPath === "/" ? "" : cleanPath}`;
    },
    [languages, location.pathname, lang, defaultLanguage, detectLangFromPath],
  );

  /**
   * Navigates to the same page but in a different language.
   */
  const navigateToLang = useCallback(
    (newLang) => {
      const pathWithoutLang = stripLangPrefix(location.pathname);
      const newPath = newLang === defaultLanguage
        ? pathWithoutLang
        : `/${newLang}${pathWithoutLang === "/" ? "" : pathWithoutLang}`;

      setLang(newLang);
      navigate(newPath);
    },
    [location.pathname, stripLangPrefix, setLang, navigate, defaultLanguage],
  );

  /**
   * Updates document meta tags from fetched data.
   */
  const updateMeta = useCallback((meta) => {
    if (!meta) return;

    if (meta.titleMeta) {
      document.title = meta.titleMeta;
    }

    const metaUpdates = {
      description: meta.descriptionMeta,
      keywords: meta.keywordsMeta,
      author: meta.authorMeta,
    };

    Object.entries(metaUpdates).forEach(([name, content]) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (el) {
        el.setAttribute("content", content || "");
      }
    });

    // Update OG tags
    const ogUpdates = {
      "og:title": meta.titleMeta,
      "og:description": meta.descriptionMeta,
      "og:image": meta.ogImage,
      "og:type": meta.ogType,
    };

    Object.entries(ogUpdates).forEach(([property, content]) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (el) {
        el.setAttribute("content", content || "");
      }
    });
  }, []);

  useEffect(() => {
    // Sync language from URL prefix if present
    const urlLang = detectLangFromPath(location.pathname);
    if (urlLang) {
      setLang(urlLang);
    } else if (languages.length > 0 && !isFirstRender.current) {
      // On subsequent navigations, if prefix is missing, revert to default
      setLang(defaultLanguage);
    }

    // Skip fetch on initial render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const fetchMeta = async () => {
      setLoading(true);
      try {
        const currentActiveLang = urlLang || lang || defaultLanguage;
        const separator = location.pathname.includes("?") ? "&" : "?";
        const url = `${location.pathname}${separator}source=frontend&lang=${currentActiveLang}`;

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "X-Blue-Bird-SPA": "true",
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.lang) {
          document.documentElement.setAttribute("lang", data.lang);
        }
        if (data.meta) {
          updateMeta(data.meta);
          setPageMeta(data.meta);
        }

        if (data.props) {
          setPageProps(data.props);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("SPA meta fetch failed:", err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMeta();

    return () => {
      controller.abort();
    };
  }, [location.pathname, languages, defaultLanguage, setLang, updateMeta]);

  return (
    <SPAContext.Provider
      value={{ pageProps, pageMeta, loading, navigateToLang, l, currentLang: lang }}
    >
      {children}
    </SPAContext.Provider>
  );
}

/**
 * Hook to access SPA navigation context.
 * @returns {{ pageProps: Object, pageMeta: Object, loading: boolean, navigateToLang: Function }}
 */
export const useSPA = () => useContext(SPAContext);
