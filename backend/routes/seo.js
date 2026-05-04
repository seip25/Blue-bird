/**
 * SEO Data File
 * Define multilingual SEO metadata for each route.
 * Used with router.seo() via the seoData option.
 *
 * Structure: { seoKey: { lang: { titleMeta, descriptionMeta, keywordsMeta } } }
 *
 * @example
 * import seoData from "./seo.js";
 * router.seo([
 *   { path: "/", component: "Home", seoKey: "home" }
 * ], { languages: ["en", "es"], defaultLanguage: "en", seoData });
 */
export default {
  home: {
    en: {
      titleMeta: "Home - Blue Bird",
      descriptionMeta: "Welcome to Blue Bird Framework",
      keywordsMeta: "blue bird, framework, express, react",
    },
    es: {
      titleMeta: "Inicio - Blue Bird",
      descriptionMeta: "Bienvenido al Framework Blue Bird",
      keywordsMeta: "blue bird, framework, express, react",
    },
  },
  about: {
    en: {
      titleMeta: "About - Blue Bird",
      descriptionMeta: "About Blue Bird Framework",
      keywordsMeta: "about, blue bird, framework",
    },
    es: {
      titleMeta: "Acerca - Blue Bird",
      descriptionMeta: "Acerca del Framework Blue Bird",
      keywordsMeta: "acerca, blue bird, framework",
    },
  },
};
