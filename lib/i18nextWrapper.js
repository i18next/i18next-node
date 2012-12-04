(function() {

    // when updating i18next dep update version here
    var i18nVersion = '1.5.9';

    var i18n = require('./dep/i18next-' + i18nVersion)
      , url = require('url')
      , Cookies = require('cookies')
      , wrapper = {};

    wrapper.Version = i18nVersion;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = wrapper;
    }

    // overriding detect language function
    var detectLanguage = function(req, res) {
        var querystring, cookies, headers, query, cookie, locale
          , locales = []
          , opts = wrapper.options;

        if (typeof req === 'object') {

            if (opts.detectLngFromPath !== false) {
                var parts = req.originalUrl.split('/');
                if (parts.length > opts.detectLngFromPath) {
                    var part = parts[opts.detectLngFromPath + 1];
                    var lookUp = wrapper.pluralExtensions.rules[part.split('-')[0]];
                    if (lookUp && (opts.supportedLngs.length === 0 || opts.supportedLngs.indexOf(lookUp) > -1)) locale = part;
                }

                if (!locale && opts.forceDetectLngFromPath) {
                    locale = opts.fallbackLng;
                }
            }

            if (!locale) { 
                querystring = url.parse(req.url, true);
                if (querystring.search) locale = querystring.query[opts.detectLngQS];
            }
            
            if (!locale && opts.useCookie) {
                cookies = new Cookies(req, res);
                locale = cookies.get(opts.cookieName);
            }
            
            if (locale) {
                locales.push(locale);
            } else { 
                locales = _extractLocales(req.headers);
            }
        }

        if (locales.length === 0) locales.push(opts.fallbackLng || 'en');

        return locales[0];
    };

    var _extractLocales = function(headers) {
        var locales = [];

        if (!headers) {
            return i18n.options.fallbackLng;
        }

        var acceptLanguage = headers['accept-language'];

        if (acceptLanguage) {
            var lngs = [];

            // associate language tags by their 'q' value (between 1 and 0)
            acceptLanguage.split(',').forEach(function(l) {
                var parts = l.split(';'); // 'en-GB;q=0.8' -> ['en-GB', 'q=0.8']

                // get the language tag qvalue: 'q=0.8' -> 0.8
                var qvalue = 1; // default qvalue
                var i;
                for (i = 0; i < parts.length; i++) {
                    var part = parts[i].split('=');
                    if (part[0] === 'q' && !isNaN(part[1])) {
                        qvalue = Number(part[1]);
                        break;
                    }
                }

                // add the tag and primary subtag to the qvalue associations
                lngs.push({lng: parts[0], q: qvalue});
            });

            lngs.sort(function(a,b) {
                return b.q - a.q;
            });

            for (i = 0; i < lngs.length; i++) {
                locales.push(lngs[i].lng);
            }

        } else {
            locales.push(i18n.options.fallbackLng);
        }

        return locales;
    };


    // overriding for the functions in i18next.js
    var f = {

        extend: function(target, source) {
            if (!source || typeof source === 'function') {
                return target;
            }
            
            for (var attr in source) { target[attr] = source[attr]; }
            return target;
        },

        each: function( object, callback, args ) {
            var name, i = 0,
                length = object.length,
                isObj = length === undefined || typeof object === "function";

            if (args) {
                if (isObj) {
                    for (name in object) {
                        if (callback.apply(object[name], args) === false) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if (callback.apply(object[i++], args) === false) {
                            break;
                        }
                    }
                }

            // A special, fast, case for the most common use of each
            } else {
                if (isObj) {
                    for (name in object) {
                        if (callback.call(object[name], name, object[name]) === false) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if (callback.call(object[i], i, object[i++]) === false) {
                            break;
                        }
                    }
                }
            }

            return object;
        },

        ajax: function() { return null; },

        detectLanguage: detectLanguage,

        cookie: {
            create: function() {},           
            read: function() {},           
            remove: function() {} 
        }
    };


    f.extend(i18n.functions, f);

    // override unused sync stuff
    i18n.functions.extend(i18n.sync, {

        configure: function(rstore, options, functions) {
            this.resStore = rstore || {};
            this.functions = functions;
            this.options = options;
        },

        load: function(lngs, options, cb) {
            var self = this
              , missingLngs = [];

            for (var i = 0, len = lngs.length; i < len; i++) {
                if (!this.resStore[lngs[i]]) missingLngs.push(lngs[i]);
            }

            if (missingLngs.length > 0) {
                this.fetch(missingLngs, options, function(err, fetched) {
                    if (err) i18n.functions.log(err);

                    self.functions.extend(self.resStore, fetched);
                    cb(err, self.resStore);
                });
            } else {
                cb(null, self.resStore);
            }
        },

        fetch: function(lngs, options, cb) {
            var self = this
              , ns = options.ns
              , store = {};

            var todo = ns.namespaces.length * lngs.length
              , errors;

            // load each file individual
            f.each(ns.namespaces, function(nsIndex, nsValue) {
                f.each(lngs, function(lngIndex, lngValue) {
                    self.fetchOne(lngValue, nsValue, function(err, data) { 
                        if (err) {
                            errors = errors || [];
                            errors.push(err);
                        }

                        store[lngValue] = store[lngValue] || {};
                        
                        if (err) {
                            store[lngValue][nsValue] = {};
                        } else {
                            store[lngValue][nsValue] = data;
                        }

                        todo--; // wait for all done befor callback
                        if (todo === 0) {
                            cb(errors, store);
                        }
                    });
                });
            });
        },

        _loadLocal: function(lngs, cb) {
            cb('not supported');
        },

        _storeLocal: function(store) {
            return;
        }
    });
    f.extend(wrapper, i18n);
    wrapper.detectLanguage = f.detectLanguage;

})();