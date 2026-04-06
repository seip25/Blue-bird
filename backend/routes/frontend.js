import Router from "@seip/blue-bird/core/router.js";
import Template from "@seip/blue-bird/core/template.js";

const routerFrontendExample = new Router();

routerFrontendExample.seo([
  {
    path: "/",
    component: "Home",
    meta: {
      titleMeta: "Home - Blue Bird",
      descriptionMeta: "Welcome to Blue Bird",
    },
    props: { id: 1, name: "Name" },
  },
  {
    path: "/about",
    component: "About",
    meta: {
      titleMeta: "Aboutt - Blue Bird",
      descriptionMeta: "About blue bird",
      keywordsMeta: "Blue Bird, About Blue Bird",
    },
    props: { id: 2, name: "Name 2" },
  },
]);

routerFrontendExample.get("*", (req, res) => {
  const response = Template.renderReact(res, "App");
  return response;
});

export default routerFrontendExample;
