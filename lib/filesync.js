var fs = require('fs');

var sync = module.exports = {

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
};