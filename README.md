# Wapplr-mongo

This package is the [Mongoose](https://github.com/Automattic/mongoose) extension for [Wapplr](https://github.com/wapplr/wapplr).

```js
//server.js
import wapplrMongo from "wapplr-mongo";
import wapplrServer from "wapplr";
const wapp = wapplrServer({config: {
        server: {
            database: {
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
const db = await wapp.server.database.addDatabase({
    //usage without global config
    /*
    config: {
        mongoConnectionString: "mongodb://localhost/wapplr",
    } 
    */
});

wapp.server.listen();
```

## License

MIT
