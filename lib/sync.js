(function() {

    var fs = require('fs')
      , sync = {}
      , resStore, f, o;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sync;
    }

    function applyReplacement(string,replacementHash){
        f.each(replacementHash,function(key,value){
            string = string.replace([o.interpolationPrefix,key,o.interpolationSuffix].join(''),value);
        });
        return string;
    }

    sync.configure = function(options) {
        resStore = options.resStore || {};
        f = options.functions;
        o = options.options;
    };

    sync.load = function(lngs, ns, useLocalStorage, dynamicLoad, cb) {
        var missingLngs = [];
        for (i = 0, len = lngs.length; i < len; i++) {
            if (!resStore[lngs[i]]) missingLngs.push(lngs[i]);
        }

        if (missingLngs.length > 0) {
            sync._fetch(missingLngs, ns, function(err, fetched){
                f.extend(resStore, fetched);

                cb(null, resStore);
            });
        } else {
            cb(null, resStore);
        }
    };

    sync._fetch = function(lngs, ns, cb) {
        var store = {};

        var todo = ns.namespaces.length * lngs.length;

        // load each file individual
        f.each(ns.namespaces, function(nsIndex, nsValue) {
            f.each(lngs, function(lngIndex, lngValue) {
                sync._fetchOne(lngValue, nsValue, function(err, data) { 

                    store[lngValue] = store[lngValue] || {};
                    
                    if (err) {
                        store[lngValue][nsValue] = {};
                    } else {
                        store[lngValue][nsValue] = data;
                    }

                    todo--; // wait for all done befor callback
                    if (todo === 0) cb(null, store);
                });
            });
        });
    };

    sync._fetchOne = function(lng, ns, cb) {

        var filename = applyReplacement(o.resGetPath, {lng: lng, ns: ns});

        fs.readFile(filename, 'utf8', function(err, data) {
            if (err) {
                console.log('error loading resourcefile: ' + filename);
                cb(err);
            } else {
                cb(null, JSON.parse(data));
            }
        });
    };

    sync.postMissing = function(ns, key, defaultValue) {

        var filename = applyReplacement(o.resGetPath, {lng: o.fallbackLng, ns: ns});

        /*var payload = {};
        payload[key] = defaultValue;

        f.ajax({
            url: applyReplacement(o.resPostPath, {lng: o.fallbackLng, ns: ns}),
            type: 'POST',
            data: payload,
            success: function(data, status, xhr) {
                resStore[o.fallbackLng][ns][key] = defaultValue;
            },
            error : function(xhr, status, error) {},
            dataType: "json"
        });*/
    };

    // override unused functions
    sync._loadLocal = function(lngs, cb) {
        cb('not supported');
    };

    sync._storeLocal = function(store) {
        return;
    };

})();