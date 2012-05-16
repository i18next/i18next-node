var redis = require('redis')
  , root = this
  , redisStorage
  , Storage;

if (typeof exports !== 'undefined') {
    redisStorage = exports;
} else {
    redisStorage = root.redisStorage = {};
}

// Create new instance of storage.
redisStorage.create = function(options, callback) {
    return new Sync(options, callback);
};

// ## redis storage
Sync = function(options, callback) {

    this.filename = __filename;
    this.isConnected = false;
    
    if (typeof options === 'function')
        callback = options;
        
    var defaults = {
        host: 'localhost',
        port: 6379,
        database: 0,
        resCollectionName: 'resources'
    };
    
    this.options = mergeOptions(options, defaults);

    this.connect(callback);
};

Sync.prototype = {

    // __connect:__ connects the underlaying database.
    //
    // `storage.connect(callback)`
    //
    // - __callback:__ `function(err, storage){}`
    connect: function(callback) {
        this.client = redis.createClient(this.options.port, this.options.host);
    
        var self = this;
        this.client.on('ready', function () {
            if (self.options.database !== 0) {
                self.client.select(self.options.database, function(err, ok) {
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

    fetchOne: function(lng, ns, cb) {

        var filename = this.functions.applyReplacement(this.options.resGetPath, {lng: lng, ns: ns});

        var self = this;
        fs.readFile(filename, 'utf8', function(err, data) {
            if (err) {
                cb(err);
            } else {
                self.functions.log('loaded file: ' + filename);
                cb(null, JSON.parse(data));
            }
        });
    },

    postMissing: function(ns, key, defaultValue) {

        // add key to resStore
        var keys = key.split('.');
        var x = 0;
        var value = this.resStore[this.options.fallbackLng][ns];
        while (keys[x]) {
            if (x === keys.length - 1) {
                value = value[keys[x]] = defaultValue;
            } else {
                value = value[keys[x]] = value[keys[x]] || {};
            }
            x++;
        }

        var filename = this.functions.applyReplacement(this.options.resSetPath, {lng: this.options.fallbackLng, ns: ns});

        var self = this;
        fs.writeFile(filename, JSON.stringify(this.resStore[this.options.fallbackLng][ns], null, 4), function (err) {
            if (err) {
                self.functions.log('error saving missingKey `' + key + '` to: ' + filename);
            } else {
                self.functions.log('saved missingKey `' + key + '` with value `' + defaultValue + '` to: ' + filename);
            }
        });
    },

    postChange: function(ns, lng, key, newValue) {
        this.load([lng], {ns: {namespaces: [ns]}}, function(err, fetched) {
        // change key in resStore
        var keys = key.split('.');
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

        var filename = this.functions.applyReplacement(this.resSetPath, {lng: lng, ns: ns});

        var self = this;
        fs.writeFile(filename, JSON.stringify(fetched[lng][ns], null, 4), function (err) {
            if (err) {
                self.functions.log('error updating key `' + key + '` with value `' + newValue + '` to: ' + filename);
            } else {
                self.functions.log('updated key `' + key + '` with value `' + newValue + '` to: ' + filename);
            }
        });
      });
    }

    // __addEvents:__ saves all events.
    //
    // `storage.addEvents(events, callback)`
    //
    // - __events:__ the events array
    // - __callback:__ `function(err){}`
    addEvents: function(events, callback) {
        if (!events || events.length === 0) { 
            callback(null);
            return;
        }
        
        var self = this
          , args = [];
          
        events.forEach(function(event) {
            args.push(JSON.stringify(event));
        });
        
        this.client.rpush(this.options.eventsCollectionName + ':' + events[0].streamId, args, function(err, res) {
            if (err) {
                callback(err);
            } else {
                self.client.rpush('undispatched:' + self.options.eventsCollectionName, args, callback);
            }
        });
    },
    
    // __addSnapshot:__ stores the snapshot
    // 
    // `storage.addSnapshot(snapshot, callback)`
    //
    // - __snapshot:__ the snaphot to store
    // - __callback:__ `function(err){}` [optional]
    addSnapshot: function(snapshot, callback) {          
        this.client.lpush(this.options.snapshotsCollectionName + ':' + snapshot.streamId, JSON.stringify(snapshot), callback);
    },

    // __getEvents:__ loads the events from _minRev_ to _maxRev_.
    // 
    // `storage.getEvents(streamId, minRev, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream
    // - __minRev:__ revision startpoint
    // - __maxRev:__ revision endpoint (hint: -1 = to end) [optional]
    // - __callback:__ `function(err, events){}`
    getEvents: function(streamId, minRev, maxRev, callback) {
        
        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }

        maxRev = maxRev > 0 ? maxRev - 1 : maxRev;
        
        this.client.lrange(this.options.eventsCollectionName + ':' + streamId, minRev, maxRev, function (err, res) {
            handleResultSet(err, res, callback);
        });
    },

    // __getEventRange:__ loads the range of events from given storage.
    // 
    // `storage.getEventRange(match, amount, callback)`
    //
    // - __match:__ match query in inner event (payload)
    // - __amount:__ amount of events
    // - __callback:__ `function(err, events){}`
    getEventRange: function(match, amount, callback) {
        var self = this;
        
        this.client.keys(this.options.eventsCollectionName + ':*', function (err, res) {
            if (err) {
                callback(err);
            } else {
                var arr = [];

                if (res.length === 0) {
                    callback(null, arr);
                } else {
                    var last = res[res.length - 1];
                    res.forEach(function(key) {
                        self.client.lrange(key, 0, -1, function (err, res) {
                            if (err) {
                                callback(err);
                            } else {
                                res.forEach(function(item) {
                                    arr.push(JSON.parse(item));
                                });
                            }
                            
                            if (key == last) {

                                arr.sort(function(a, b){
                                     return a.commitStamp - b.commitStamp;
                                });

                                var index = 0;

                                if (match) {
                                    for (var m in match) {
                                        if (match.hasOwnProperty(m)) {

                                            for (var len = arr.length; index < len; index++) {
                                                var evt = arr[index];
                                                
                                                if (evt.payload[m] === match[m]) {
                                                    break;
                                                }
                                            }
                                            
                                            break;
                                        }
                                    }
                                }

                                if (arr.length > index + 1) {

                                    var endIndex = 0;
                                    if (arr.length > index + 1 + amount) {
                                        endIndex = index + 1 + amount;
                                    } else if (arr.length <= index + 1 + amount) {
                                        endIndex = arr.length;
                                    }

                                    arr = arr.slice(index + 1, endIndex);
                                }

                                callback(null, arr);
                            }
                        });
                    });
                }
            }
        });
    },

    // __getSnapshot:__ loads the next snapshot back from given max revision or the latest if you 
    // don't pass in a _maxRev_.
    // 
    // `storage.getSnapshot(streamId, maxRev, callback)`
    //
    // - __streamId:__ id for requested stream
    // - __maxRev:__ revision endpoint (hint: -1 = to end)
    // - __callback:__ `function(err, snapshot){}`
    getSnapshot: function(streamId, maxRev, callback) {
        
        if (typeof maxRev === 'function') {
            callback = maxRev;
            maxRev = -1;
        }
    
        if (maxRev === -1) {
            this.client.lrange(this.options.snapshotsCollectionName + ':' + streamId, 0, 0, function (err, res) {
                if (res && res.length === 1) {
                    callback(err, JSON.parse(res[0]));
                } else {
                    callback(err, null);
                }
            });
        }
        else {
            this.client.lrange(this.options.snapshotsCollectionName + ':' + streamId, 0, -1, function (err, res) {
                if (err) {
                    callback(err);
                } else if (res && res.length > 0) {
                    for (var i = res.length - 1; i >= 0; i--) {
                        var snap = JSON.parse(res[i]);
                        if (snap.revision <= maxRev) {
                            callback(null, snap);
                            break;
                        }
                    }
                }
                else {
                    callback(null, {});
                }
            });
        } 
    },

    // __getUndispatchedEvents:__ loads all undispatched events.
    //
    // `storage.getUndispatchedEvents(callback)`
    //
    // - __callback:__ `function(err, events){}`
    getUndispatchedEvents: function(callback) {
        this.client.lrange('undispatched:' + this.options.eventsCollectionName, 0, -1, function (err, res) {
            handleResultSet(err, res, callback);
        });
    },

    // __setEventToDispatched:__ sets the given event to dispatched.
    //
    // __hint:__ instead of the whole event object you can pass: {_id: 'commitId'}
    //
    // `storage.setEventToDispatched(event, callback)`
    //
    // - __event:__ the event
    // - __callback:__ `function(err, events){}` [optional]
    setEventToDispatched: function(event, callback) {
        this.client.lrem('undispatched:' + this.options.eventsCollectionName, 0, JSON.stringify(event), function (err) {
            callback(err);
        });
    },

    // __getId:__ loads a new id from storage.
    //
    // `storage.getId(callback)`
    //
    // - __callback:__ `function(err, id){}`
    getId: function(callback) {
        this.client.incr('nextItemId', function(err, id) {
            if (err) {
                callback(err);
            } else {
                callback(null, id.toString());
            }
        });
    }
};

// helpers
var handleResultSet = function(err, res, callback) {
    if (err) {
        callback(err);
    }
    else if (res && res.length > 0) {
        var arr = [];

        res.forEach(function(item) {
            arr.push(JSON.parse(item));
        });
        
        callback(null, arr);
    }
    else {
        callback(null, []);
    }
};

var mergeOptions = function(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }
    
    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;  
};
