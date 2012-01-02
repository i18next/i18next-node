(function() {

    var i18n = require('./i18nextWrapper')
      , Cookies = require('cookies');

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = i18n;
    }

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