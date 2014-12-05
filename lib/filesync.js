var fs = require('fs')
  , path = require('path')
  , JSON5 = require('json5');

var sync = module.exports = {

    saveResourceSet: function(lng, ns, resourceSet, cb) {
        var filename = this.functions.applyReplacement(this.options.resSetPath, {lng: lng, ns: ns});
        fs.writeFile(filename, JSON.stringify(resourceSet, null, this.options.jsonIndent || 4), cb);
    },

    fetchOne: function(lng, ns, cb) {

        var filename = this.functions.applyReplacement(this.options.resGetPath, {lng: lng, ns: ns});

        var self = this;
        fs.readFile(filename, 'utf8', function(err, data) {
            if (err) {
                cb(err);
            } else {
                self.functions.log('loaded file: ' + filename);

                try {
                    var result = path.extname(filename) === '.json5' ?
                        JSON5.parse(data.replace(/^\uFEFF/, '')) :
                        JSON.parse(data.replace(/^\uFEFF/, '')) // strip byte-order mark
                } catch (err) {
                    err.message = 'error parsing '+filename+': '+err.message;
                    return cb(err);
                }
                cb(null, result);
            }
        });
    },

    saveMissing: function(lng, ns, key, defaultValue, callback) {

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

        var filename = this.functions.applyReplacement(this.options.resSetPath, {lng: lng, ns: ns});

        var self = this;
        this.saveResourceSet(lng, ns, this.resStore[lng][ns], function(err) {
            if (err) {
                self.functions.log('error saving missingKey `' + key + '` to: ' + filename);
            } else {
                self.functions.log('saved missingKey `' + key + '` with value `' + defaultValue + '` to: ' + filename);
            }
            if (typeof callback === 'function') callback(err);
        });
    },

    postChange: function(lng, ns, key, newValue, callback) {
        var self = this;
        this.load([lng], {ns: {namespaces: [ns]}}, function(err, fetched) {
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

            var filename = self.functions.applyReplacement(self.options.resGetPath, {lng: lng, ns: ns});

            self.saveResourceSet(lng, ns, fetched[lng][ns], function(err) {
                if (err) {
                    self.functions.log('error updating key `' + key + '` with value `' + newValue + '` to: ' + filename);
                } else {
                    self.functions.log('updated key `' + key + '` with value `' + newValue + '` to: ' + filename);
                }
                if (typeof callback === 'function') callback(err);
            });
        });
    },

    postRemove: function(lng, ns, key, callback) {
        var self = this;
        this.load([lng], {ns: {namespaces: [ns]}}, function(err, fetched) {
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

            var filename = self.functions.applyReplacement(self.options.resGetPath, {lng: lng, ns: ns});

            self.saveResourceSet(lng, ns, fetched[lng][ns], function(err) {
                if (err) {
                    self.functions.log('error removing key from: ' + filename);
                } else {
                    self.functions.log('removed key from: ' + filename);
                }
                if (typeof callback === 'function') callback(err);
            });
        });
    }
};
