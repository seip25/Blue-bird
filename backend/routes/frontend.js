import Router from "../../core/router.js";
import Template from "../../core/template.js";
import App from "../../core/app.js";
import seoData from "./seo.js";

const routerFrontendExample = new Router();
routerFrontendExample.use(App.helmet()); // Helmet for frontend router

routerFrontendExample.get("/landing", (req, res) => {
  return Template.renderHtml(res, "landing", {
    metaTags:{
      titleMeta:"Landing Example",
      descriptionMeta: "Description meta",
      keywordsMeta: "keywordsMeta"
    }
  });
});

routerFrontendExample.seo(
  [
    {
      path: "/",
      component: "Home",
      seoKey: "home",
      props: { id: 1, name: "Name" },
    },
    {
      path: "/about",
      component: "About",
      seoKey: "about",
      props: { id: 2, name: "Name 2" },
    },
  ],
  { languages: ["en", "es"], defaultLanguage: "en", seoData },
);

routerFrontendExample.get("*", (req, res) => {
  return Template.renderReact(res, "App");
});

export default routerFrontendExample;
