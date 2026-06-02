import Router from "../../core/router.js";
import Template from "../../core/template.js";
import App from "../../core/app.js";

const routerFrontendExample = new Router("/", { seo: true, languages: ["en", "es"] });
routerFrontendExample.use(App.helmet());

routerFrontendExample.get("/", (req, res) => {
  return Template.render(res, "index", {
    metaTags: {
      titleMeta: "Home - Blue Bird",
      descriptionMeta: "Welcome to Blue Bird Framework",
      keywordsMeta: "blue bird, framework, express"
    }
  });
});

routerFrontendExample.get("/about", (req, res) => {
  return Template.render(res, "about", {
    metaTags: {
      titleMeta: "About - Blue Bird",
      descriptionMeta: "About Blue Bird Framework",
      keywordsMeta: "about, blue bird, framework"
    }
  });
});

export default routerFrontendExample;
