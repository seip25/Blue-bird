import Router from "@seip/blue-bird/core/router.js";
import Template from "@seip/blue-bird/core/template.js";
import App from "@seip/blue-bird/core/app.js";
import seoData from "./seo.js";

const routerFrontendExample = new Router();
routerFrontendExample.use(App.helmet()); // Helmet for frontend router

/* Render HTML frontend/landing.html */
routerFrontendExample.get("/landing", (req, res) => {
  return Template.renderHtml(res, "landing", {
    metaTags: {
      titleMeta: "Landing Example",
      descriptionMeta: "Description meta",
      keywordsMeta: "keywordsMeta"
    }
  });
});
/* End Render HTML frontend/landing.html */

/* SEO example */
routerFrontendExample.seo(
  [
    {
      path: "/",
      component: "Home",
      seoKey: "home",//key in seo.js data
      props: { id: 1, name: "Name" },// Props pass to react component or 
    },
    {
      path: "/about",
      component: "About",
      seoKey: "about",//key in seo.js data 
      props: { id: 2, name: "Name 2" },
    },
  ],
  { languages: ["en", "es"], defaultLanguage: "en", seoData },
);
/* End SEO example */

/* Render React example for '*' route (catch all routes) */
routerFrontendExample.get("*", (req, res) => {
  return Template.renderReact(res, "App");
});
/* End Render React example */

export default routerFrontendExample;
