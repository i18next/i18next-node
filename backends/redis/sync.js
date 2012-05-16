var redis = require('redis');

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
            port: 6379,
            database: 0,
            resCollectionName: 'resources'
        };

        options = mergeOptions(options, defaults);

        this.resCollectionName = options.resCollectionName;

        var self = this;

        this.client = redis.createClient(options.port, options.host);

        this.client.on('ready', function () {
            if (options.database !== 0) {
                self.client.select(options.database, function(err, ok) {
                    if (err) {
                        if (callback) callback(err);
                    } else {
                        self.isConnected = true;
                        if (callback) callback(null, self);
                    }
                });
            } else {
                self.isConnected = true;
                if (callback) callback(null, self);
            }
        });
    },

    saveResourceSet: function(lng, ns, resourceSet, cb) {
        var id = ns + '_' + lng;

        resourceSet.lng = resourceSet.lng || lng;
        resourceSet.namespace = resourceSet.namespace || ns;

        this.client.set(this.resCollectionName + ':' + id, JSON.stringify(resourceSet), cb);
    },

    loadResourceSet: function(lng, ns, cb) {

        var id = ns + '_' + lng;
        var self = this;

        this.client.get(this.resCollectionName + ':' + id, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if(!res) {
                    cb(null, { resources: {} });
                } else {
                    self.functions.log('loaded from redis: ' + id);
                    cb(null, JSON.parse(res));
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
                    self.functions.log('error saving missingKey `' + key + '` to redis');
                } else {
                    self.functions.log('saved missingKey `' + key + '` with value `' + defaultValue + '` to redis');
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
                    self.functions.log('error updating key `' + key + '` to redis');
                } else {
                    self.functions.log('updated key `' + key + '` with value `' + defaultValue + '` to redis');
                }
            });
        });
    }

};

// helpers
// var handleResultSet = function(err, res, callback) {
//     if (err) {
//         callback(err);
//     }
//     else if (res && res.length > 0) {
//         var arr = [];

//         res.forEach(function(item) {
//             arr.push(JSON.parse(item));
//         });

//         callback(null, arr);
//     }
//     else {
//         callback(null, []);
//     }
// };

var mergeOptions = function(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }
    
    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;  
};
