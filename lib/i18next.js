(function() {

    var i18n = require('./i18nextWrapper')
      , sync = require('./sync')
      , Cookies = require('cookies');

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = i18n;
    }

    var resStore;
    var orgInit = i18n.init;

    i18n.init = function(options, cb) {

        options.resSetPath = options.resSetPath || 'locales/__lng__/__ns__.json';
        options.sendMissing = options.saveMissing || false;

        resStore = (options && options.resStore) ? options.resStore : {};
        
        sync.configure({
            options: i18n.functions.extend(i18n.options, options),
            functions: i18n.functions,
            resStore: resStore
        });

        i18n.functions.extend(i18n.sync, sync);

        orgInit(options, cb);
    };

    i18n.handle = function(req, res, next) {
        var locales = i18n.detectLanguage(req, res);

        i18n.setLng(locales[0], function() {
            i18n.persistCookie(req, res, i18n.lng());
            next();
        });
    };

    i18n.registerAppHelper = function(app) {
        app.helpers({
            t: i18n.t
        });
    };

    i18n.persistCookie = function(req, res, locale) {
        var cookies = new Cookies(req, res);
        var expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);

        cookies.set('i18next', locale, { expires: expirationDate });
    };

})();