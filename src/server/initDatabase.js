import mongoose from "mongoose";
import addJsonSchemaToMongoose from "mongoose-schema-jsonschema";
import {mergeProperties, defaultDescriptor} from "./utils";
import {copyObject} from "wapplr/dist/common/utils";

addJsonSchemaToMongoose(mongoose);

export default function initDatabase(p = {}) {
    const {wapp} = p;
    const server = wapp.server;

    if (!server.database) {

        const defaultDatabasesObject = Object.create(Object.prototype, {
            addDatabase: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: async function addDatabase(p = {}) {

                    const server = wapp.server;
                    const globalDatabaseConfig = (server.config && server.config.database) ? server.config.database : {};

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
                            database: {
                                ...defaultDescriptor,
                                writable: false,
                                enumerable: false,
                                value: database
                            },
                            getJsonSchema: {
                                ...defaultDescriptor,
                                enumerable: false,
                                value: function jsonSchmema(p = {}) {
                                    const {doNotDeleteDisabledFields = false} = p;

                                    if (!database.models[modelName].jsonSchema) {
                                        return null;
                                    }
                                    const jsonSchema = database.models[modelName].jsonSchema();
                                    delete jsonSchema.properties.__v;

                                    function recursiveCheck(modelSchema, schema) {

                                        Object.keys(modelSchema).forEach(function (key) {

                                            const modelProperties = modelSchema[key];

                                            const options = modelProperties.wapplr || {};

                                            const {
                                                disabled,
                                            } = options;

                                            if (schema[key]) {

                                                if (!schema[key].type && modelProperties.instance){
                                                    schema[key].type = modelProperties.instance.toLowerCase();
                                                }

                                                if (modelProperties.wapplr) {
                                                    schema[key].wapplr = {...options};
                                                }

                                                ["default", "required", "unique", "pattern", "ref", "validate"].forEach((saveKey)=>{
                                                    let value =
                                                        (typeof options[saveKey] !== "undefined") ?
                                                            options[saveKey] :
                                                            (typeof modelProperties[saveKey] !== "undefined") ?
                                                                modelProperties[saveKey] : schema[key][saveKey];

                                                    if (value && value.toJSON) {
                                                        value = value.toJSON();
                                                    }
                                                    if (saveKey === "pattern" && value && typeof value == "object" && value.source){
                                                        value = value.source;
                                                    }

                                                    if (typeof value !== "undefined") {

                                                        if ((schema[key].wapplr && typeof schema[key].wapplr[saveKey] == "undefined") || (!schema[key].wapplr)) {
                                                            if (!schema[key].wapplr) {
                                                                schema[key].wapplr = {}
                                                            }
                                                            schema[key].wapplr[saveKey] = value;
                                                            if (saveKey === "required"){
                                                                schema[key].wapplr[saveKey] = !!(value);
                                                            }
                                                        }

                                                        if (schema[key].wapplr && schema[key].wapplr[saveKey] && typeof schema[key][saveKey] == "undefined") {
                                                            schema[key][saveKey] = value;
                                                            if (saveKey === "validate" && typeof value === "function" && schema[key].wapplr.validationMessage){
                                                                schema[key][saveKey] = [value, schema[key].wapplr.validationMessage]
                                                            }
                                                        }
                                                    }

                                                });

                                                if (typeof schema[key].pattern !== "undefined") {
                                                    delete schema[key].pattern;
                                                }

                                                if (typeof schema[key]["x-ref"] !== "undefined") {
                                                    delete schema[key]["x-ref"]
                                                }

                                            }

                                            if (schema[key] && schema[key].properties){
                                                recursiveCheck(modelProperties.type?.tree || modelProperties, schema[key].properties);
                                            } else {
                                                if (disabled && !doNotDeleteDisabledFields){
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
                        };

                        const defaultModelObject = Object.create(Object.prototype, properties);
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
                    });

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
                    const globalDatabaseConfig = (server.config && server.config.database) ? server.config.database : {};

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
        });

        Object.defineProperty(server, "database", {
            ...defaultDescriptor,
            writable: false,
            value: defaultDatabasesObject
        });

        Object.defineProperty(server.database, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

        if (wapp.states) {
            wapp.states.addHandle({
                statesFromDatabase: function statesFromDatabase(req, res, next) {

                    if (wapp.globals.DEV && !res.wappResponse.store.getState("res._schema")) {

                        const schema = {};

                        Object.keys(server.database).forEach(function (mongoConnectionString, i) {
                            const models = server.database[mongoConnectionString].models;
                            if (models && typeof models == "object" && Object.keys(models).length) {
                                schema[i] = {};
                                Object.keys(models).forEach(function (modelName) {

                                    schema[i][modelName] = models[modelName].getJsonSchema();
                                    try{
                                        schema[i][modelName] = copyObject(schema[i][modelName])
                                    }catch (e){}

                                    try {
                                        function recursiveCheck(modelSchema) {
                                            Object.keys(modelSchema).forEach(function (key) {
                                                const modelProperties = modelSchema[key];
                                                if (modelProperties && modelProperties.wapplr && modelProperties.wapplr.pattern && modelProperties.wapplr.pattern.source) {
                                                    modelProperties.wapplr.pattern = modelProperties.wapplr.pattern.source;
                                                }
                                                if (modelProperties && modelProperties.properties) {
                                                    recursiveCheck(modelProperties);
                                                }
                                            })
                                        }

                                        recursiveCheck(schema[i][modelName].properties);
                                    } catch (e){}

                                    try {
                                        // eslint-disable-next-line
                                        eval(`function test() {
                                            // noinspection JSUnusedLocalSymbols
                                            var a = ${JSON.stringify(schema[i][modelName])};
                                        }

                                        test()`)
                                    } catch (e) {
                                        //delete schema[i][modelName];
                                        console.log("Can't parse "+modelName+" schema object, error:", e)
                                    }
                                })
                            }
                        });

                        res.wappResponse.store.dispatch(wapp.states.runAction("res", {name: "_schema", value: schema}));

                    }

                    next();

                }
            })
        }

    }

    return server.database;

}
