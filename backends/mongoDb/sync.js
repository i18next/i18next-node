var util = require("util");

var mongo = require('mongodb');

var MongoClient = mongo.MongoClient;

module.exports = {

    // __connect:__ connects the underlaying database.
    //
    // `storage.connect(callback)`
    //
    // - __callback:__ `function(err, storage){}`
    connect: function (mongoURI, collectionName, options, callback) {
        var self = this;
        var defaultMongoURI = "mongodb://localhost:27017/i18next";
        var defaultCollectionName = "resources";
        var defaultOptions = {};

        self.isConnected = false;

        if (typeof mongoURI === "function") callback = mongoURI;
        else if (typeof collectionName === "function") callback = collectionName;
        else if (typeof options === "function") callback = options;

        if (typeof mongoURI === "string") defaultMongoURI = mongoURI;
        if (typeof collectionName === "string") defaultCollectionName = collectionName;
        if (typeof options === "object" && !util.isArray(options)) defaultOptions = options;

        MongoClient.connect(defaultMongoURI, defaultOptions, function (err, db) {
            if (err) {
                if (callback) callback(err);
                else throw err;
            }

            self.isConnected = true;
            self.client = db;
            self.resources = db.collection(defaultCollectionName);

            if (callback) callback(null, self);
        });
    },

    saveResourceSet: function (lng, ns, resourceSet, cb) {
        var toSave = { resources: resourceSet };
        toSave._id = ns + '_' + lng;
        toSave.lng = lng;
        toSave.namespace = ns;

        this.resources.save(toSave, { safe: true }, cb);
    },

    fetchOne: function (lng, ns, cb) {
        var _id = ns + '_' + lng;

        var self = this;
        this.resources.findOne({ _id: _id }, function (err, obj) {
            if (err) {
                cb(err);
            } else {
                if (!obj) {
                    cb(null, { });
                } else {
                    self.functions.log('loaded from mongoDb: ' + _id);
                    cb(null, obj.resources);
                }
            }
        });
    },

    saveMissing: function (lng, ns, key, defaultValue, callback) {
        // add key to resStore
        var keys = key.split(this.options.keyseparator);
        var x = 0;
        var value = this.resStore[lng][ns];
        while (keys[x]) {
            if (x === keys.length - 1) {
                value = value[keys[x]] = defaultValue;
            } else {
                value = value[keys[x]] = value[keys[x]] || {};
            }
            x++;
        }

        var self = this;
        this.saveResourceSet(lng, ns, this.resStore[lng][ns], function (err) {
            if (err) {
                self.functions.log('error saving missingKey `' + key + '` to mongoDb');
            } else {
                self.functions.log('saved missingKey `' + key + '` with value `' + defaultValue + '` to mongoDb');
            }
            if (typeof callback === 'function') callback(err);
        });
    },

    postChange: function (lng, ns, key, newValue, callback) {
        var self = this;

        this.load([lng], {ns: {namespaces: [ns]}}, function (err, fetched) {
            // change key in resStore
            var keys = key.split(self.options.keyseparator);
            var x = 0;
            var value = fetched[lng][ns];
            while (keys[x]) {
                if (x === keys.length - 1) {
                    value = value[keys[x]] = newValue;
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            self.saveResourceSet(lng, ns, fetched[lng][ns], function (err) {
                if (err) {
                    self.functions.log('error updating key `' + key + '` to mongoDb');
                } else {
                    self.functions.log('updated key `' + key + '` with value `' + newValue + '` to mongoDb');
                }
                if (typeof callback === 'function') callback(err);
            });
        });
    },

    postRemove: function (lng, ns, key, callback) {
        var self = this;

        this.load([lng], {ns: {namespaces: [ns]}}, function (err, fetched) {
            // change key in resStore
            var keys = key.split(self.options.keyseparator);
            var x = 0;
            var value = fetched[lng][ns];
            while (keys[x]) {
                if (x === keys.length - 1) {
                    delete value[keys[x]];
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            self.saveResourceSet(lng, ns, fetched[lng][ns], function (err) {
                if (err) {
                    self.functions.log('error removing key `' + key + '` to mongoDb');
                } else {
                    self.functions.log('removed key `' + key + '` to mongoDb');
                }
                if (typeof callback === 'function') callback(err);
            });
        });
    }

};

// helper
var mergeOptions = function (options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }

    var merged = {};
    for (var attrname in defaultOptions) {
        merged[attrname] = defaultOptions[attrname];
    }
    for (attrname in options) {
        if (options[attrname]) merged[attrname] = options[attrname];
    }
    return merged;
};
