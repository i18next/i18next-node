(function() {

    // when updating dep/i18next.xx.js update version here
    var i18nVersion = '1.5.10';

    var i18n = require('./dep/i18next-' + i18nVersion)
      , url = require('url')
      , Cookies = require('cookies')
      , wrapper = {};

    wrapper.Version = i18nVersion;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = wrapper;
    }

    // checks if there are rules registered for a given locale
    var _rulesExist = function(locale) {
        return !!wrapper.pluralExtensions.rules[locale.split(/[\-_]/)[0]];
    };

    // checks if the locale is supported
    var _isSupportedLocale = function(locale) {
        var opts = wrapper.options;

        // any of the supported locales
        if (Array.isArray(opts.supportedLngs)) return opts.supportedLngs.indexOf(locale) > -1;

        // any locale with registered rules
        return _rulesExist(locale);
    };


    // overriding detect language function
    var detectLanguage = function(req, res) {
        var locale, querystring, cookies, _lng
          , opts = wrapper.options;

        if (typeof req === 'object') {

            if (opts.detectLngFromPath !== false) {
                var parts = req.originalUrl.split('/');
                if (parts.length > opts.detectLngFromPath) {
                    _lng = parts[opts.detectLngFromPath + 1];
                    if (_lng && _isSupportedLocale(_lng)) locale = _lng;
                }

                if (!locale && opts.forceDetectLngFromPath) {
                    locale = opts.fallbackLng;
                }
            }

            if (!locale) { 
                if (req.query) {
                    _lng = req.query[opts.detectLngQS];
                } else {
                    querystring = url.parse(req.url, true);
                    _lng = querystring.query[opts.detectLngQS];
                }
                if (_lng && _isSupportedLocale(_lng)) locale = _lng;
            }
            
            if (!locale && opts.useCookie) {
                if (req.cookies) {
                    _lng = req.cookies[opts.cookieName];
                } else {
                    cookies = new Cookies(req, res);
                    _lng = cookies.get(opts.cookieName);
                }
                if (_lng && _isSupportedLocale(_lng)) locale = _lng;
            }
            
            if (!locale && (req.acceptedLanguages || req.headers)) {
                var locales = req.acceptedLanguages ||
                        _extractAcceptedLanguages(req.headers);
                for (var i = 0, len = locales.length; i < len; i++) {
                    _lng = locales[i];
                    // get the first supported locale
                    if (_isSupportedLocale(_lng)) {
                        locale = _lng;
                        break;
                    } else {
                        var _lng2 = _stripRegion(_lng);           // locale without region code
                        if (_lng !== _lng2 &&                     // prevents some useless function calls
                                locales.indexOf(_lng2) === -1 &&  // ensures _lng2 is not listed later in accept-language
                                _isSupportedLocale(_lng2)) {
                            locale = _lng2;
                            break;
                        }
                    }
                }
            }
        }

        return locale || opts.fallbackLng;
    };


    // 'en-GB' -> 'en'; 'zh-Hans-HK' -> 'zh-Hans';
    function _stripRegion(locale) {
        var _parts = locale.split(/[\-_]/)
          , _end;
        if (_parts.length > 1) {
            _end = _parts[_parts.length - 1];
            // ensures last part is a region code instead of a script
            if (_end.length === 2) return locale.slice(0, -3);
        }
        return locale;
    }


    // 'en-GB;q=.8' -> ['en-GB', 0.8]
    var _parseLocaleAndQuality = function(val) {
        var _part = val.split(';'),
          _lng = _part[0],
          _q = _part[1] || 1;
        if (isNaN(_q)) _q = parseFloat(_q.replace('q=', ''));
        return [_lng, _q];
    }

    // return an array of user's accepted languages ordered by quality
    var _extractAcceptedLanguages = function(headers) {
        if (headers['accept-language']) {
            var locales, _parts = headers['accept-language'].split(',');
            // associate language tags by their 'q' value (between 1 and 0)
            locales = _parts.map(_parseLocaleAndQuality);  // [['en-GB', 0.8], ['en', 0.6]]
            locales.sort(function(a,b) { return b[1] - a[1]; }); // sorted by quality (DESC)
            return locales.map(function(a) { return a[0]; }); // ['en-GB', 'en']
        }
        return [];
    }
    

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
