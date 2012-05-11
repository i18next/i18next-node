var fs = require('fs')
  , sync = {}
  , resStore, f, o;

var sync = module.exports = {

    fetchOne: function(lng, ns, cb) {

        var filename = this.functions.applyReplacement(this.options.resGetPath, {lng: lng, ns: ns});

        fs.readFile(filename, 'utf8', function(err, data) {
            if (err) {
                cb(err);
            } else {
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

        fs.writeFile(filename, JSON.stringify(this.resStore[this.options.fallbackLng][ns], null, 4), function (err) {
            if (err) {
                console.log('error saving missingKey `' + key + '` to: ' + filename);
            }
        });
    },

    postChange: function(ns, lng, key, newValue) {
        this.load([lng], {ns: {namespaces: [ns]}}, function(err, resStore) {
        // change key in resStore
        var keys = key.split('.');
        var x = 0;
        var value = resStore[lng][ns];
        while (keys[x]) {
            if (x === keys.length - 1) {
                value = value[keys[x]] = newValue;
            } else {
                value = value[keys[x]] = value[keys[x]] || {};
            }
            x++;
        }

        var filename = applyReplacement(o.resSetPath, {lng: lng, ns: ns});

        fs.writeFile(filename, JSON.stringify(resStore[lng][ns], null, 4), function (err) {
            if (err) {
                console.log('error saving missingKey `' + key + '` to: ' + filename);
            }
        });
      });
    }
};