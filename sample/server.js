var express = require('express')
  , app = express.createServer()
  , i18n = require('../index');

i18n.init({
    ns: { namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'},
    resSetPath: 'locales/__lng__/new.__ns__.json',
    saveMissing: true
});

// Configuration
app.configure(function() {
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(i18n.handle);
    

    app.set('view engine', 'jade');
    app.set('views', __dirname);
});

i18n.registerAppHelper(app)
    .serveClientScript(app)
    .serveDynamicResources(app)
    .serveMissingKeyRoute(app);

app.get('/', function(req, res){
	res.render('index', { layout: false });
});

app.get('/str', function(req, res) {
    res.send('locale: ' + req.locale + '<br /> key nav.home -> ' + req.i18n.t('nav.home'));
});

app.listen(3000);