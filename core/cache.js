const CACHE = {};
/**
 * Cache Middleware
 * @example 
 * router.get("/stats",
    Cache.middleware(120),
    controller.stats
);
 * */
class Cache {

    static middleware(seconds = 60) {
        return (req, res, next) => {

            const key = req.originalUrl;

            if (CACHE[key] && CACHE[key].expiry > Date.now()) {
                return res.json(CACHE[key].data);
            }

            const originalJson = res.json.bind(res);

            res.json = (body) => {
                CACHE[key] = {
                    data: body,
                    expiry: Date.now() + seconds * 1000
                };
                return originalJson(body);
            };

            next();
        };
    }
}

export default Cache;