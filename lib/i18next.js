(function() {

    var i18n = require('./i18nextWrapper')
      , fs = require('fs')
      , sync = require('./sync')
      , Cookies = require('cookies');

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = i18n;
    }

    var resStore;
    var orgInit = i18n.init;

    i18n.init = function(options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        options = options || {};
        options.resSetPath = options.resSetPath || 'locales/__lng__/__ns__.json';
        options.sendMissing = options.saveMissing || false;
        options.useSync = options.useSync === undefined ? true : options.useSync;

        resStore = (options && options.resStore) ? options.resStore : {};
        
        if (options.useSync) {
            i18n.functions.extend(i18n.sync, sync);
        }

        if (typeof i18n.sync.configure === 'function') {
            i18n.sync.configure({
                options: i18n.functions.extend(i18n.options, options),
                functions: i18n.functions,
                resStore: resStore
            });
        }

        orgInit(options, cb);
    };

    i18n.handle = function(req, res, next) {
        var locales = i18n.detectLanguage(req, res);

        // set locale & i18n in req
        req.locale = locales[0];
        req.i18n = i18n;

        i18n.setLng(locales[0], function() {
            i18n.persistCookie(req, res, i18n.lng());
            next();
        });
    };

    i18n.registerAppHelper = function(app) {
        app.helpers({
            t: i18n.t
        });

        return i18n;
    };

    i18n.serveClientScript = function(app) {
        app.get('/i18next/i18next.js', function(req, res) {
            var filename = (process.env.NODE_ENV !== 'production' || process.env['DEBUG']) ? __dirname + '/dep/i18next-' + i18n.Version + '.js' : __dirname + '/dep/i18next-' + i18n.Version + '.min.js';

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

            languages = req.query.lng.split(' ');
            namespaces = req.query.ns.split(' ');

            i18n.sync.load(languages, {namespaces: namespaces}, false, false, function() {

                languages.forEach(function(lng) {
                    if (!resources[lng]) resources[lng] = {};


                    namespaces.forEach(function(ns) {
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

            res.send('OK');
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
