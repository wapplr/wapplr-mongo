import wapplrServer from 'wapplr';
import initDatabase from "./initDatabase";

export default async function createServer(p = {}) {
    const wapp = p.wapp || wapplrServer({...p});
    await initDatabase({wapp, ...p});
    return wapp;
}

export function createMiddleware(p = {}) {
    return async function mongoMiddleware(req, res, next) {
        const wapp = req.wapp || p.wapp || await createServer(p);
        await initDatabase({wapp, ...p});
        next();
    }
}

export async function run(p = {}) {

    const wapp = await createServer(p);
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.server.app;
    if (typeof DEV !== "undefined" && DEV && module.hot) {
        app.hot = module.hot;
    }
    app.use(createMiddleware({wapp, ...p}));
    wapp.server.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        module.hot.accept("./index");
    }

    return wapp;

}

if (typeof RUN !== "undefined" && RUN === "wapplr-mongo") {
    run({
        config: {
            globals: {
                DEV: (typeof DEV !== "undefined") ? DEV : undefined,
                WAPP: (typeof WAPP !== "undefined") ? WAPP : undefined,
                RUN: (typeof RUN !== "undefined") ? RUN : undefined,
                TYPE: (typeof TYPE !== "undefined") ? TYPE : undefined,
            }
        }
    });
}
