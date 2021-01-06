# Wapplr-mongo

This package is the [Mongoose](https://github.com/Automattic/mongoose) extension for [Wapplr](https://github.com/wapplr/wapplr).

```js
//server.js
import wapplrMongo from "wapplr-mongo";
import wapplrServer from "wapplr";
const wapp = wapplrServer({config: {
        server: {
            databaseConfig: {
                mongoConnectionString: "mongodb://localhost/wapplr",
            }
        },
        globals: {
            WAPP: "yourBuildHash",
            ROOT: __dirname
        }
    }
});
wapplrMongo({wapp});
wapp.server.listen();
```

## License

MIT
