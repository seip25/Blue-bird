import Router from "@seip/blue-bird/core/router.js";
import Template from "@seip/blue-bird/core/template.js";
import App from "@seip/blue-bird/core/app.js";

const routerFrontendExample = new Router("/", { seo: true });

//routerFrontendExample.use(App.helmet());

routerFrontendExample.get("/", (req, res) => {
  return Template.render(res, "index", {
    metaTags: {
      titleMeta: "Home - Blue Bird",
      descriptionMeta: "Welcome to Blue Bird Framework",
      keywordsMeta: "blue bird, framework, express",
    },
  });
});

routerFrontendExample.get("/about", (req, res) => {
  return Template.render(res, "about", {
    metaTags: {
      titleMeta: "About - Blue Bird",
      descriptionMeta: "About Blue Bird Framework",
      keywordsMeta: "about, blue bird, framework",
    },
  });
});

routerFrontendExample.get("/preact_example", (req, res) => {
  return Template.render(res, "preact_example", {
    metaTags: {
      titleMeta: "Preact Example - Blue Bird",
      descriptionMeta: "Preact Example Blue Bird Framework",
      keywordsMeta: "preact, example, blue bird, framework",
    },
  });
});

export default routerFrontendExample;
