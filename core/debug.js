import Router from "./router.js";

/**
 * Advanced Debug module for Blue Bird.
 * Provides metrics history, route statistics and live monitoring.
 */
class Debug {

    constructor() {
        this.router = new Router("/debug");
        this.limit = 50;
        this.initStore();
        this.registerRoutes();
    }

    initStore() {
        if (!global.__bluebird_debug_store__) {
            global.__bluebird_debug_store__ = {
                requests: [],
                routes: {},
                errors4xx: 0,
                errors5xx: 0
            };
        }
    }

    static shouldTrack(req) {
        const url = req.originalUrl || "";

        if (url.startsWith("/debug")) return false;

        if (/\.(json|css|js|map|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(url)) {
            return false;
        }

        if (req.method === "OPTIONS") return false;

        return true;
    }

    static middlewareMetrics(app) {
        app.use((req, res, next) => {

            if (!Debug.shouldTrack(req)) return next();

            const start = process.hrtime();

            res.on("finish", () => {

                const diff = process.hrtime(start);
                const responseTime = diff[0] * 1e3 + diff[1] / 1e6;

                const memory = process.memoryUsage();
                const ramUsedMB = memory.rss / 1024 / 1024;

                const cpuUsage = process.cpuUsage();
                const cpuUsedMS = (cpuUsage.user + cpuUsage.system) / 1000;

                const record = {
                    method: req.method,
                    url: req.originalUrl,
                    status: res.statusCode,
                    responseTime: Number(responseTime.toFixed(2)),
                    ramUsedMB: Number(ramUsedMB.toFixed(2)),
                    cpuUsedMS: Number(cpuUsedMS.toFixed(2)),
                    date: new Date().toISOString()
                };

                const store = global.__bluebird_debug_store__;

                store.requests.unshift(record);
                if (store.requests.length > 50) store.requests.pop();

                const routeKey = `${req.method} ${req.route?.path || req.path}`;

                if (!store.routes[routeKey]) {
                    store.routes[routeKey] = {
                        count: 0,
                        totalTime: 0
                    };
                }

                store.routes[routeKey].count += 1;
                store.routes[routeKey].totalTime += record.responseTime;

                if (record.status >= 400 && record.status < 500) store.errors4xx++;
                if (record.status >= 500) store.errors5xx++;
            });

            next();
        });
    }

    registerRoutes() {

        this.router.get("/", (req, res) => {

            const store = global.__bluebird_debug_store__;

            if (req.query.fetch === "true") {
                return res.json(store);
            }

            if (req.query.reset === "true") {
                global.__bluebird_debug_store__ = {
                    requests: [],
                    routes: {},
                    errors4xx: 0,
                    errors5xx: 0
                };
                return res.json({ ok: true });
            }

            res.send(`
<!DOCTYPE html>
<html>
<head>
<script src="https://cdn.tailwindcss.com"></script>
<title>Blue Bird Debug</title>
</head>
<body class="bg-gray-100 text-gray-800 p-10">

<div class="max-w-7xl mx-auto">

<div class="flex justify-between items-center mb-8">
<h1 class="text-3xl font-bold text-blue-600">Blue Bird Debug Panel</h1>
<button onclick="resetData()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow">
Reset
</button>
</div>

<div class="grid grid-cols-3 gap-6 mb-8">

<div class="bg-white p-6 rounded-xl shadow">
<h3 class="text-gray-500 text-sm">Total Requests</h3>
<p id="totalReq" class="text-2xl font-bold">0</p>
</div>

<div class="bg-yellow-100 p-6 rounded-xl shadow">
<h3 class="text-yellow-600 text-sm">4xx Errors</h3>
<p id="err4" class="text-2xl font-bold text-yellow-700">0</p>
</div>

<div class="bg-red-100 p-6 rounded-xl shadow">
<h3 class="text-red-600 text-sm">5xx Errors</h3>
<p id="err5" class="text-2xl font-bold text-red-700">0</p>
</div>

</div>

<div class="grid grid-cols-2 gap-10">

<div class="bg-white p-6 rounded-xl shadow">
<h2 class="text-lg font-semibold mb-4">Route Stats</h2>
<table class="table-fixed w-full text-sm">
<thead>
<tr class="border-b">
<th class="text-left w-1/2 py-2">Route</th>
<th class="text-left w-1/4">Hits</th>
<th class="text-left w-1/4">Avg Time</th>
</tr>
</thead>
<tbody id="routesBody"></tbody>
</table>
</div>

<div class="bg-white p-6 rounded-xl shadow">
<h2 class="text-lg font-semibold mb-4">Last Requests</h2>
<table class="table-fixed w-full text-sm">
<thead>
<tr class="border-b">
<th class="text-left w-1/2 py-2">URL</th>
<th class="text-left w-1/6">Method</th>
<th class="text-left w-1/6">Status</th>
<th class="text-left w-1/6">Time</th>
</tr>
</thead>
<tbody id="historyBody"></tbody>
</table>
</div>

</div>

</div>

<script>
async function loadData() {
    const res = await fetch('/debug?fetch=true');
    const data = await res.json();

    document.getElementById("totalReq").innerText = data.requests.length;
    document.getElementById("err4").innerText = data.errors4xx;
    document.getElementById("err5").innerText = data.errors5xx;

    const routesBody = document.getElementById("routesBody");
    const historyBody = document.getElementById("historyBody");

    routesBody.innerHTML = "";
    historyBody.innerHTML = "";

    Object.entries(data.routes).forEach(([key, value]) => {
        const avg = (value.totalTime / value.count).toFixed(2);
        let color = "";
        if (avg > 500) color = "text-red-600 font-semibold";
        else if (avg > 200) color = "text-yellow-600";

        routesBody.innerHTML += \`
        <tr class="border-b">
            <td class="py-1 truncate">\${key}</td>
            <td>\${value.count}</td>
            <td class="\${color}">\${avg} ms</td>
        </tr>\`;
    });

    data.requests.forEach(r => {
        historyBody.innerHTML += \`
        <tr class="border-b text-xs">
            <td class="truncate">\${r.url}</td>
            <td>\${r.method}</td>
            <td>\${r.status}</td>
            <td>\${r.responseTime} ms</td>
        </tr>\`;
    });
}

async function resetData() {
    await fetch('/debug?reset=true');
    loadData();
}

loadData();
setInterval(loadData, 3000);
</script>

</body>
</html>
            `);
        });
    }

    getRouter() {
        return {
            path: this.router.getPath(),
            router: this.router.getRouter()
        };
    }
}

export default Debug;