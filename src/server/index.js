import wapplrServer from 'wapplr';
import initDatabase from "./initDatabase";

export default function createServer(p = {}) {
    const wapp = p.wapp || wapplrServer({...p});
    return initDatabase({wapp, ...p});
}

export function createMiddleware(p = {}) {
    return function mongoMiddleware(req, res, next) {
        const wapp = req.wapp || p.wapp || createServer(p).wapp;
        initDatabase({wapp, ...p});
        next();
    }
}

const defaultConfig = {
    config: {
        globals: {
            DEV: (typeof DEV !== "undefined") ? DEV : undefined,
            WAPP: (typeof WAPP !== "undefined") ? WAPP : undefined,
            RUN: (typeof RUN !== "undefined") ? RUN : undefined,
            TYPE: (typeof TYPE !== "undefined") ? TYPE : undefined,
            ROOT: (typeof ROOT !== "undefined") ? ROOT : __dirname
        }
    }
};

export function run(p = defaultConfig) {

    const {env} = process;
    env.NODE_ENV = process.env.NODE_ENV;

    const wapp = createServer(p).wapp;
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.server.app;
    app.use(createMiddleware({wapp, ...p}));
    wapp.server.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        app.hot = module.hot;
        module.hot.accept("./index");
    }

    return wapp;
}

if (typeof RUN !== "undefined" && RUN === "wapplr-mongo") {
    run();
}
