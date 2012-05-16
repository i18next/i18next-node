var mongo = require('mongodb');

module.exports = {

    // __connect:__ connects the underlaying database.
    //
    // `storage.connect(callback)`
    //
    // - __callback:__ `function(err, storage){}`
    connect: function(options, callback) {

        this.isConnected = false;

        if (typeof options === 'function')
            callback = options;
            
        var defaults = {
            host: 'localhost',
            port: 27017,
            dbName: 'i18next',
            resCollectionName: 'resources'
        };

        options = mergeOptions(options, defaults);

        var self = this;

        var server = new mongo.Server(options.host, options.port, {});
        new mongo.Db(options.dbName , server, {}).open(function(err, client) {
            if (err) {
                if (callback) callback(err);
            } else {
                self.isConnected = true;
                self.client = client;
                
                self.resources = new mongo.Collection(client, options.resCollectionName);

                if (callback) callback(null, self);
            }        
        });
    },

    saveResourceSet: function(lng, ns, resourceSet, cb) {
        if (!resourceSet._id) resourceSet._id = ns + '_' + lng;
        if (!resourceSet.lng) resourceSet.lng = lng;
        if (!resourceSet.namespace) resourceSet.namespace = ns;

        this.resources.save(resourceSet, { safe: true }, cb);
    },

    loadResourceSet: function(lng, ns, cb) {

        var _id = ns + '_' + lng;

        var self = this;
        this.resources.findOne({ _id: _id }, function(err, obj) {
            if (err) {
                cb(err);
            } else {
                if(!obj) {
                    cb(null, { resources: {} });
                } else {
                    self.functions.log('loaded from mongoDb: ' + _id);
                    cb(null, obj);
                }
            }
        });
    },

    fetchOne: function(lng, ns, cb) {

        this.loadResourceSet(lng, ns, function(err, obj) {
            if (!obj) {
                cb(err);
            } else {
                cb(err, obj.resources);
            }
        });
    },

    postMissing: function(ns, key, defaultValue) {
        var self = this;

        this.loadResourceSet(this.options.fallbackLng, ns, function(err, res) {
            // add key to resStore
            var keys = key.split('.');
            var x = 0;
            var value = res.resources;
            while (keys[x]) {
                if (x === keys.length - 1) {
                    value = value[keys[x]] = defaultValue;
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            self.saveResourceSet(self.options.fallbackLng, ns, res, function(err) {
                if (err) {
                    self.functions.log('error saving missingKey `' + key + '` to mongoDb');
                } else {
                    self.functions.log('saved missingKey `' + key + '` with value `' + defaultValue + '` to mongoDb');
                }
            });
        });
    },

    postChange: function(ns, lng, key, newValue) {
        var self = this;

        this.loadResourceSet(lng, ns, function(err, res) {
            // add key to resStore
            var keys = key.split('.');
            var x = 0;
            var value = res.resources;
            while (keys[x]) {
                if (x === keys.length - 1) {
                    value = value[keys[x]] = newValue;
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            self.saveResourceSet(lng, ns, res, function(err) {
                if (err) {
                    self.functions.log('error updating key `' + key + '` to mongoDb');
                } else {
                    self.functions.log('updated key `' + key + '` with value `' + defaultValue + '` to mongoDb');
                }
            });
        });
    }

};

// helper
var mergeOptions = function(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }
    
    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;  
};
