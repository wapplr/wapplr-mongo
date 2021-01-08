import mongoose from "mongoose";
import addJsonSchemaToMongoose from 'mongoose-schema-jsonschema';
import {mergeProperties, defaultDescriptor} from "./utils";

addJsonSchemaToMongoose(mongoose);

export default function initDatabase(p = {}) {
    const {wapp} = p;
    const server = wapp.server;

    if (!server.database) {

        const defaultDatabasesObejct = Object.create(Object.prototype, {
            addDatabase: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: async function addDatabase(p = {}) {

                    const server = wapp.server;
                    const globalDatabaseConfig = (server.settings && server.settings.database) ? server.settings.database : {};

                    const {
                        mongoConnectionString = globalDatabaseConfig.mongoConnectionString || "mongodb://localhost/wapplr",
                        connection
                    } = p;

                    function defaultAddModel(p = {}) {

                        const {modelName, Model, resolvers = {}} = p;

                        const database = server.database[mongoConnectionString];

                        const properties = {
                            modelName: {
                                ...defaultDescriptor,
                                writable: false,
                                enumerable: false,
                                value: modelName
                            },
                            getJsonSchema: {
                                ...defaultDescriptor,
                                enumerable: false,
                                value: function jsonSchmema() {
                                    if (!database.models[modelName].jsonSchema) {
                                        return null;
                                    }
                                    const jsonSchema = database.models[modelName].jsonSchema();
                                    jsonSchema.properties.id = jsonSchema.properties._id;
                                    delete jsonSchema.properties._id;
                                    delete jsonSchema.properties.__v;

                                    function recursiveCheck(tree, schema) {

                                        Object.keys(tree).forEach(function (key) {
                                            const property = tree[key]
                                            const type = property.type;
                                            if (typeof type === "object"){
                                                recursiveCheck(property, schema[key].properties);
                                            } else {
                                                const options = property.wapplr || {};
                                                const {hidden} = options;
                                                if (hidden){
                                                    delete schema[key];
                                                }
                                            }
                                        })

                                    }

                                    recursiveCheck(database.models[modelName].schema.tree, jsonSchema.properties);

                                    return jsonSchema;
                                }
                            },
                            resolvers: {
                                ...defaultDescriptor,
                                value: resolvers
                            }
                        }

                        const defaultModelObject = Object.create(Object.prototype, properties)
                        mergeProperties(Model, defaultModelObject);

                        database.models[modelName] = Model;
                        return database.models[modelName];

                    }

                    function defaultGetModel(p = {}) {
                        const {modelName} = p;
                        const database = server.database[mongoConnectionString];
                        return database.models[modelName]
                    }

                    const defaultDatabaseObject = Object.create(Object.prototype, {
                        models: {
                            ...defaultDescriptor,
                            writable: false,
                            value: {}
                        },
                        addModel: {
                            ...defaultDescriptor,
                            value: defaultAddModel
                        },
                        getModel: {
                            ...defaultDescriptor,
                            value: defaultGetModel
                        },
                        connection: {
                            ...defaultDescriptor,
                            writable: false,
                            value: connection || await mongoose.createConnection(mongoConnectionString, {
                                useNewUrlParser: true,
                                useUnifiedTopology: true
                            })
                        }
                    })

                    Object.defineProperty(server.database, mongoConnectionString, {
                        ...defaultDescriptor,
                        writable: false,
                        value: defaultDatabaseObject
                    });

                    return server.database[mongoConnectionString];

                }
            },
            getDatabase: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: async function getDatabase(p = {}) {

                    const server = wapp.server;
                    const globalDatabaseConfig = (server.settings && server.settings.database) ? server.settings.database : {};

                    const {
                        mongoConnectionString = globalDatabaseConfig.mongoConnectionString || "mongodb://localhost/wapplr",
                        addIfThereIsNot,
                        connection
                    } = p;

                    const db = server.database[mongoConnectionString];
                    if (db || !addIfThereIsNot){
                        return db;
                    }

                    return await server.database.addDatabase({mongoConnectionString, connection});
                }
            },
        })

        Object.defineProperty(server, "database", {
            ...defaultDescriptor,
            writable: false,
            value: defaultDatabasesObejct
        });

        if (wapp.states) {
            wapp.states.addHandle({
                schema: function defaultStatesForSchmema(req, res, next) {

                    const schema = {};
                    const requests = {};

                    Object.keys(server.database).forEach(function (mongoConnectionString, i) {
                        const models = server.database[mongoConnectionString].models;
                        if (models && typeof models == "object" && Object.keys(models).length) {
                            schema[i] = {};
                            Object.keys(models).forEach(function (modelName) {
                                schema[i][modelName] = models[modelName].getJsonSchema()
                                if (models[modelName].resolvers) {
                                    Object.keys(models[modelName].resolvers).forEach(function(key){
                                        requests[key] = {
                                            schema: schema[i][modelName]
                                        };
                                        Object.keys(models[modelName].resolvers[key]).forEach(function (resPropKey){
                                            if (typeof models[modelName].resolvers[key][resPropKey] !== "function"){
                                                try{
                                                    JSON.stringify(models[modelName].resolvers[key][resPropKey])
                                                    requests[key][resPropKey] = models[modelName].resolvers[key][resPropKey];
                                                } catch (e){}
                                            }
                                        })
                                    })
                                }
                            })
                        }
                    })

                    wapp.response.store.dispatch(wapp.states.runAction("res", {name: "schema", value: schema}))
                    wapp.response.store.dispatch(wapp.states.runAction("res", {name: "requests", value: requests}))
                    wapp.response.state = wapp.response.store.getState();

                    next();

                }
            })
        }

    }

}
