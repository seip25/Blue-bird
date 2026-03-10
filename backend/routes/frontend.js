import Router from "@seip/blue-bird/core/router.js"
import Template from "@seip/blue-bird/core/template.js"

const routerFrontendExample = new Router();

const routesFrontend = [
    {
        path: "/",
        component: "Home",
        meta: { titleMeta: "Home - Blue Bird", descriptionMeta: "Welcome to Blue Bird" },
        props: { id: 1, name: "Name" }

    },
    {
        path: "/about",
        component: "About",
        meta: { titleMeta: "About - Blue Bird", descriptionMeta: "About blue bird" },
        props: { id: 2, name: "Name 2" }
    },

];
routesFrontend.forEach(route_ => {
    routerFrontendExample.get(route_.path, (req, res) => {
        const dynamicProps = {
            props: {
                params: req.params,
                query: req.query,
                ...route_.props ?? {}
            }
        };

        return Template.renderReact(res, route_.component, dynamicProps, {
            metaTags: route_.meta,
        });
    });
});


routerFrontendExample.get("*", (req, res) => {
    const response = Template.renderReact(res, "App");
    return response;
})

export default routerFrontendExample;
