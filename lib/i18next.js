(function() {

    var i18n = require('./i18nextWrapper')
      , fs = require('fs')
      , filesync = require('./filesync')
      , Cookies = require('cookies');

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = i18n;
    }

    var resStore
      , backend
      , orgInit = i18n.init;

    i18n.init = function(options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        options = options || {};
        options.resSetPath = options.resSetPath || 'locales/__lng__/__ns__.json';
        options.sendMissing = options.saveMissing || false;
        resStore = (options && options.resStore) ? options.resStore : {};
        
        // obsolete
        if (options.useSync) console.log('options.useSync is obsolete use i18next.backend(...) instead.');

        var o = i18n.functions.extend(i18n.options, options);

        // extend functions with applyReplacement
        var applyReplacement = function(string, replacementHash) {
            i18n.functions.each(replacementHash, function(key, value) {
                string = string.replace([o.interpolationPrefix, key, o.interpolationSuffix].join(''), value);
            });
            return string;
        };
        i18n.functions.extend(i18n.functions, {
            applyReplacement: applyReplacement
        });
        
        if (!backend) backend = filesync;

        i18n.functions.extend(i18n.sync, backend);

        if (typeof i18n.sync.configure === 'function') {
            i18n.sync.configure(resStore, o, i18n.functions);
        }

        orgInit(options, cb);
    };

    i18n.backend = function(sync) {
        backend = sync;
    };

    i18n.handle = function(req, res, next) {
        var locales = i18n.detectLanguage(req, res);

        // set locale & i18n in req
        req.locale = req.lng = req.language = locales[0];
        req.i18n = i18n;

        i18n.setLng(locales[0], function() {
            i18n.persistCookie(req, res, i18n.lng());
            next();
        });
    };

    i18n.registerAppHelper = function(app) {
        if(app.helpers) {
          app.helpers({
            t: i18n.t,
            i18n: {
                t: i18n.t,
                translate: i18n.t,
                lng: i18n.lng,
                locale: i18n.lng,
                language: i18n.lng
            }
          });
        } else {
            app.locals.t = i18n.t;
            app.locals.i18n = {
                t: i18n.t,
                translate: i18n.t,
                lng: i18n.lng,
                locale: i18n.lng,
                language: i18n.lng
            };
        }

        return i18n;
    };

    i18n.serveClientScript = function(app) {
        app.get('/i18next/i18next.js', function(req, res) {
            var filename = (process.env.NODE_ENV !== 'production' || process.env.DEBUG) ? __dirname + '/dep/i18next-' + i18n.Version + '.js' : __dirname + '/dep/i18next-' + i18n.Version + '.min.js';

            fs.readFile(filename, function(err, data) {
                if (err) console.log(err);
                res.writeHead(200, {
                        'Content-Type': 'text/javascript',
                        'Content-Length': data.length,
                        'Last-Modified': new Date(),
                        'Date': (new Date()).toUTCString(),
                        'Cache-Control': 'public max-age=' + 31536000,
                        'Expires': (new Date(new Date().getTime()+63113852000)).toUTCString()
                });
                res.end(data);
            });
        });

        return i18n;
    };

    i18n.serveDynamicResources = function(app) {
        app.get('/locales/resources.json', function(req, res) {

            var resources = {};

            res.contentType('json');

            var languages = req.query.lng.split(' ')
              , opts = { ns: { namespaces: req.query.ns.split(' ') } };

            i18n.sync.load(languages, opts, function() {

                languages.forEach(function(lng) {
                    if (!resources[lng]) resources[lng] = {};

                    opts.ns.namespaces.forEach(function(ns) {
                        if (!resources[lng][ns]) resources[lng][ns] = resStore[lng][ns] || {};
                    });
                });

                res.send(resources);
            });
        });

        return i18n;
    };

    i18n.serveMissingKeyRoute = function(app) {
        app.post('/locales/add/:lng/:ns', function(req, res) {

            var lng = req.params.lng;
            var ns = req.params.ns;
     
            for (var m in req.body) {
                i18n.sync.postMissing(ns, m, req.body[m]);
            }

            res.json('ok');
        });

        return i18n;
    };

    i18n.serveChangeKeyRoute = function(app) {
        app.post('/locales/change/:lng/:ns', function(req, res) {

            var lng = req.params.lng;
            var ns = req.params.ns;
   
            for (var m in req.body) {
                i18n.sync.postChange(ns, lng, m, req.body[m]);
            }

            res.json('ok');
      });

      return i18n;
    };

    i18n.persistCookie = function(req, res, locale) {
        var cookies = new Cookies(req, res);
        var expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);

        cookies.set('i18next', locale, { expires: expirationDate, httpOnly : false });
    };

})();
