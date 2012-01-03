var express = require('express')
  , app = express.createServer()
  , i18n = require('../index');

var resStore = {
    dev: { translation: { simpleTest_dev: 'ok_from_dev' } },
    en: { translation: { simpleTest_en: 'ok_from_en' } },            
    'en-US': { translation: { 'simpleTest_en-US': 'ok_from_en-US' } }
};

i18n.init({
    ns: { namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'}
});

i18n.registerAppHelper(app);

// Configuration
app.configure(function() {
    app.use(i18n.handle);
    app.use(app.router);

    app.set('view engine', 'jade');
    app.set('views', __dirname);
});

app.get('/', function(req, res){
	res.render('index', { layout: false });
});

app.listen(3000);