var express = require('express')
  , app = express()
  , i18n = require('../index');

// use mongoDb
// var i18nMongoSync = require('../backends/mongoDb/index');
// i18nMongoSync.connect(function() {

//     i18nMongoSync.saveResourceSet('en-US', 'ns.special', {
//         "app": {
//             "name": "i18n",
//             "insert": "you are __youAre__",
//             "child": "__count__ child",
//             "child_plural": "__count__ children",
//             "friend_context": "A friend",
//             "friend_context_male": "A boyfriend",
//             "friend_context_female": "A girlfriend"
//         }
//     }, function() {
//         i18n.backend(i18nMongoSync);

//         i18n.init({
//             ns: { namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'},
//             resSetPath: 'locales/__lng__/new.__ns__.json',
//             saveMissing: true,
//             debug: true
//         });
//     });
// });

// use redis
// var i18nRedisSync = require('../backends/redis/index');
// i18nRedisSync.connect(function() {

//     i18nRedisSync.saveResourceSet('en-US', 'ns.special', {
//         "app": {
//             "name": "i18n",
//             "insert": "you are __youAre__",
//             "child": "__count__ child",
//             "child_plural": "__count__ children",
//             "friend_context": "A friend",
//             "friend_context_male": "A boyfriend",
//             "friend_context_female": "A girlfriend"
//         }
//     }, function(err) {
//         i18n.backend(i18nRedisSync);

//         i18n.init({
//             ns: { namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'},
//             resSetPath: 'locales/__lng__/new.__ns__.json',
//             saveMissing: true,
//             debug: true
//         });
//     });
// });

// use filesys
i18n.init({
    ns: { namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'},
    resSetPath: 'locales/__lng__/new.__ns__.json',
    saveMissing: true,
    debug: true,
    sendMissingTo: 'fallback'
});

// Configuration
app.configure(function() {
    app.use(express.bodyParser());
    app.use(i18n.handle); // have i18n befor app.router
    
    app.use(app.router);
    app.set('view engine', 'jade');
    app.set('views', __dirname);
});

i18n.registerAppHelper(app)
    .serveClientScript(app)
    .serveDynamicResources(app)
    .serveMissingKeyRoute(app);

i18n.serveWebTranslate(app, {
    i18nextWTOptions: {
      languages: ['de-DE', 'en-US',  'dev'],
      namespaces: ['ns.common', 'ns.special'],
      resGetPath: "locales/resources.json?lng=__lng__&ns=__ns__",
      resChangePath: 'locales/change/__lng__/__ns__',
      resRemovePath: 'locales/remove/__lng__/__ns__',
      fallbackLng: "dev",
      dynamicLoad: true
    }
});

app.get('/', function(req, res) {
	res.render('index', { layout: false });
});

app.get('/str', function(req, res) {
    res.send('locale: ' + req.locale + '<br /> key nav.home -> ' + req.i18n.t('nav.home'));
});

app.listen(3000);