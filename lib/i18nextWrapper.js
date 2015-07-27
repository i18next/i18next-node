(function() {

    var i18n = require('i18next-client')
      , url = require('url')
      , Cookies = require('cookies')
      , wrapper = {};

    wrapper.version = require('../package.json').version;
    wrapper.clientVersion = require('i18next-client/package.json').version;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = wrapper;
    }

    // detection subfunctions
    function detectLanguageFromUserland(req, res, options) {
        var locale, locales = [];
        locale = options.detectLanguageFn(req, res);
        if (locale) locales.push({lng: cleanLngString(locale, options), q: 1});
        return locales;
    }

    function detectLanguageFromPath(req, res, options) {
        var locale, locales = [];
        var parts = req.originalUrl.split('/');
        if (parts.length > options.detectLngFromPath + 1) {
            var part = parts[options.detectLngFromPath + 1];
            var lookUp = wrapper.pluralExtensions.rules[part.split('-')[0]];
            if (!lookUp) lookUp = options.supportedLngs.indexOf(part) > -1;
            if (lookUp) locale = part;
        }
        if (locale) locales.push({lng: cleanLngString(locale, options), q: 1});
        return locales;
    }

    function detectLanguageFromQuerystring(req, res, options) {
        var locale, locales = [];
        if (req.query) {
            locale = req.query[options.detectLngQS];
        } else {
            var querystring = url.parse(req.url, true);
            locale = querystring.query[options.detectLngQS];
        }
        if (locale) locales.push({lng: cleanLngString(locale, options), q: 1});
        return locales;
    }

    function detectLanguageFromCookie(req, res, options) {
        var locale, locales = [];
        if (req.cookies) {
            locale = req.cookies[options.cookieName];
        } else {
            var cookies = new Cookies(req, res);
            locale = cookies.get(options.cookieName);
        }
        if (locale) locales.push({lng: cleanLngString(locale, options), q: 1});
        return locales;
    }

    var detectLanguageFromHeader = function(req, res, options) {
        var headers = req.headers;
        var locales = [];

        if (!headers) {
            return locales;
        }

        var acceptLanguage = headers['accept-language'];

        if (acceptLanguage) {
            var lngs = [], i;

            // associate language tags by their 'q' value (between 1 and 0)
            acceptLanguage.split(',').forEach(function(l) {
                var parts = l.split(';'); // 'en-GB;q=0.8' -> ['en-GB', 'q=0.8']

                // get the language tag qvalue: 'q=0.8' -> 0.8
                var qvalue = 1; // default qvalue

                for (i = 0; i < parts.length; i++) {
                    var part = parts[i].split('=');
                    if (part[0] === 'q' && !isNaN(part[1])) {
                        qvalue = Number(part[1]);
                        break;
                    }
                }

                // add the tag and primary subtag to the qvalue associations
                lngs.push({lng: cleanLngString(parts[0], options), q: qvalue});
            });

            lngs.sort(function(a,b) {
                return b.q - a.q;
            });

            for (i = 0; i < lngs.length; i++) {
                locales.push(lngs[i]);
            }
        }

        return locales;
    };

    function checkAgainstSupportedLng(locales, supportedLngs) {
        if (!supportedLngs.length && locales.length) {
            return [locales[0]];
        } else {
            for (var i = 0, len = locales.length; i < len; i++) {
                var locale = locales[i];
                if (supportedLngs.indexOf(locale.lng) > -1) {
                    return [locale];
                }
                if (locale.lng.indexOf('-') > -1) {
                    var unspecific = locale.lng.split('-')[0];
                    if (supportedLngs.indexOf(unspecific) > -1) {
                        locale.lng = unspecific;
                        return [locale];
                    }
                }
            }
        }
        return [];
    }

    function cleanLngString(lng, options) {
        if (typeof lng === 'string' && lng.indexOf('-') > -1) {
            var parts = lng.split('-');

            lng = options.lowerCaseLng ?
                parts[0].toLowerCase() +  '-' + parts[1].toLowerCase() :
                parts[0].toLowerCase() +  '-' + parts[1].toUpperCase();
        }
        return lng;
    }

    // overriding detect language function
    var detectLanguage = function(req, res) {
        var locales = []
          , opts = wrapper.options;

        if (typeof req === 'object') {

            // user-land fn
            if (!locales.length && opts.detectLanguageFn) {
                locales = detectLanguageFromUserland(req, res, opts);
                locales = checkAgainstSupportedLng(locales, opts.supportedLngs);
            }

            // from path
            if (!locales.length && opts.detectLngFromPath !== false) {
                locales = detectLanguageFromPath(req, res, opts);
                locales = checkAgainstSupportedLng(locales, opts.supportedLngs);

                if (!locales.length && opts.forceDetectLngFromPath) {
                    locales = [{lng: opts.fallbackLng[0], q: 1}];
                }
            }

            // from querystring
            if (!locales.length) {
                locales = detectLanguageFromQuerystring(req, res, opts);
                locales = checkAgainstSupportedLng(locales, opts.supportedLngs);
            }

            // from cookie
            if (!locales.length && opts.useCookie) {
                locales = detectLanguageFromCookie(req, res, opts);
                locales = checkAgainstSupportedLng(locales, opts.supportedLngs);
            }

            // from headers
            if (!locales.length && opts.detectLngFromHeaders) {
                locales = detectLanguageFromHeader(req, res, opts);
                locales = checkAgainstSupportedLng(locales, opts.supportedLngs);
            }
        }

        if (!locales.length) locales.push({lng: opts.fallbackLng[0] || 'en', q: 1});

        return locales[0].lng;
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
        detectLanguageFromPath: detectLanguageFromPath,
        detectLanguageFromQuerystring: detectLanguageFromQuerystring,
        detectLanguageFromCookie: detectLanguageFromCookie,
        detectLanguageFromHeader: detectLanguageFromHeader,
        checkAgainstSupportedLng: checkAgainstSupportedLng,

        cookie: {
            create: function() {},
            read: function() {},
            remove: function() {}
        }

    };


    f.extend(i18n.functions, f);

    // override unused sync stuff
    i18n.functions.extend(i18n.sync, {

        reload: function (cb) {
            this.resStore = {};
            i18n.setLng(i18n.lng(), cb);
        },

        configure: function(rstore, options, functions) {
            this.resStore = rstore || {};
            this.functions = functions;
            this.options = options;

            this._fetch = this.fetch;
            this._fetchOne = this.fetchOne;
        },

        load: function(lngs, options, cb) {
            var self = this
              , namespaces = options.ns.namespaces
              , toLoad = {};

            for (var i = 0, len = lngs.length; i < len; i++) {
                var lng = lngs[i];
                toLoad[lng] = [];

                for (var x = 0, len2 = namespaces.length; x < len2; x++) {
                    if (!this.resStore[lng] || !this.resStore[lng][namespaces[x]]) toLoad[lng].push(namespaces[x]);
                }
            }

            var todo = 0;
            for (var m in toLoad) {
                if (toLoad[m].length) {
                    todo++;
                } else {
                    delete toLoad[m];
                }
            }

            if (todo > 0) {
                function fetchForLng(n) {
                    self.fetch([n], {ns: { namespaces: toLoad[n] } }, function(err, fetched) {
                        if (err) i18n.functions.log(err);

                        // replace newly loaded ns
                        for (var y = 0, len3 = toLoad[n].length; y < len3; y++) {
                            var toAddNs = toLoad[n][y];
                            self.resStore[n] = self.resStore[n] || {};

                            // skip that if we get an error having `.i18nSkipOnError`
                            // this is used in remote sync to promote an unavaiable remote
                            // so resources could be loaded on next request
                            if (fetched[n][toAddNs] && fetched[n][toAddNs].i18nSkipOnError) continue;

                            self.resStore[n][toAddNs] = self.resStore[n][toAddNs] || {};

                            self.functions.extend(self.resStore[n][toAddNs], fetched[n][toAddNs]);
                        }

                        todo--;
                        if(todo === 0) {
                            cb(err, self.resStore);
                        }
                    });
                }

                for (var n in toLoad) {
                    fetchForLng(n);
                }
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

            if(ns.namespaces.length === 0)
                cb('namespaces not found', null);
            else {
                // load each file individual
                f.each(ns.namespaces, function(nsIndex, nsValue) {
                    f.each(lngs, function(lngIndex, lngValue) {
                        self.fetchOne(lngValue, nsValue, function(err, data) {
                            if(err) {
                                errors = errors || [];
                                errors.push(err);
                            }

                            store[lngValue] = store[lngValue] || {};

                            if (err) {
                               store[lngValue][nsValue] = !err.i18nSkipOnError ? {} : err;
                            } else {
                              store[lngValue][nsValue] = data;
                            }

                            todo--; // wait for all done befor callback
                            if(todo === 0) {
                                cb(errors, store);
                            }
                        });
                    });
                });
            }
        },

        postMissing: function(lng, ns, key, defaultValue) {
            var self = this
              , lngs = [];

            if (this.options.sendMissingTo === 'fallback' && this.options.fallbackLng[0] !== false) {
                for (var i = 0; i < this.options.fallbackLng.length; i++) {
                    lngs.push(this.options.fallbackLng[i]);
                }
            } else if (this.options.sendMissingTo === 'current' || (this.options.sendMissingTo === 'fallback' && this.options.fallbackLng[0] === false)) {
                lngs.push(lng);
            } else if (this.options.sendMissingTo === 'all') {
                lngs = i18n.functions.toLanguages(lng);
            }

            f.each(lngs, function(i, l) {
                if (!self.resStore[l] || !self.resStore[l][ns]) {
                    self.functions.log('error saving missingKey `' + key + '` cause namespace `' + ns + '` was not loaded for language `' + l + '`.' );
                } else {
                    self.saveMissing(l, ns, key, defaultValue);
                }
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
    wrapper.detectLanguage = function () {
        // use the real f.detectLanguage() in case .init() overwrote it
        return wrapper.functions.detectLanguage.apply(wrapper, arguments);
    };

})();
