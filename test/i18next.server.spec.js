var i18n = require('../index')
  , expect = require('expect.js')
  , sinon = require('sinon')
  , request = require('supertest')
  , express = require('express');

describe('i18next.server.spec', function() {

  var opts, app;

  before(function(done) {
    opts = {
      lng: 'en-US',
      preload: [],
      lowerCaseLng: false,
      ns: 'translation',
      resGetPath: 'test/locales/__lng__/__ns__.json',
      resSetPath: 'test/locales/__lng__/new.__ns__.json',
      saveMissing: true,
      resStore: false,
      debug: false
    };

    app = express();

    i18n.init(opts, function(t) { done(); });

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
      .serveMissingKeyRoute(app)
      .serveChangeKeyRoute(app);
  
  });

  describe('server functionality', function() {

    describe('i18next registered app.helper / app.locals', function() {

      it('it should have t function appended', function() {
        expect(app.locals.t).to.be.ok();
      });

      it('it should translate with appended function', function() {
        expect(app.locals.t('simple_en-US')).to.be('ok_from_en-US');
      });

      it('it should have i18n appended', function() {
        expect(app.locals.i18n).to.be.ok();
      });

    });

    describe('i18next registered routes', function() {

      describe('GET locales/resources.json?lng=&ns=', function() {

        it('respond with json', function(done) {

          request(app)
            .get('/locales/resources.json?lng=en&ns=translation')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200, done);

        });

      });

      describe('GET /i18next/i18next.js', function() {

        it('respond with json', function(done) {

          request(app)
            .get('/i18next/i18next.js')
            .set('Accept', 'text/javascript')
            .expect('Content-Type', /javascript/)
            .expect(200, done);

        });

      });

      describe('POST /locales/add/:lng/:ns', function() {

        it('respond with json "ok"', function(done) {

          request(app)
            .post('/locales/add/de/translation')
            .set({data: { name: 'Manny', species: 'cat' }})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('"ok"')
            .expect(200, done);

        });

      });

      describe('POST /locales/change/:lng/:ns', function() {

        it('respond with json "ok"', function(done) {

          request(app)
            .post('/locales/change/de/translation')
            .set({data: { name: 'Manny', species: 'cat' }})
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('"ok"')
            .expect(200, done);

        });

      });

    });

  });

});