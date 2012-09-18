var i18n = require('../index')
  , expect = require('expect.js')
  , sinon = require('sinon')
  , filesync = require('../lib/filesync');

describe('i18next.basic.spec', function() {

  var opts;

  beforeEach(function() {
    opts = {
      lng: 'en-US',
      preload: [],
      lowerCaseLng: false,
      ns: 'translation',
      resGetPath: 'test/locales/__lng__/__ns__.json',
      resSetPath: 'test/locales/__lng__/new.__ns__.json',
      saveMissing: false,
      resStore: false,
      returnObjectTrees: false,
      debug: false
    };
  });

  describe('basic functionality', function() {

    describe('setting language', function() {

      beforeEach(function(done) {
        i18n.init(i18n.functions.extend(opts, {
          resStore: {
            'en-US': { translation: { 'simpleTest': 'ok_from_en-US' } },
            'de-DE': { translation: { 'simpleTest': 'ok_from_de-DE' } }
          }
        }), function(t) { done(); } );
      });

      it('it should provide resources for set language', function(done) {
        expect(i18n.t('simpleTest')).to.be('ok_from_en-US');

        i18n.setLng('de-DE', function(t) {
            expect(t('simpleTest')).to.be('ok_from_de-DE');
            done();
        });

      });

    });

    describe('preloading multiple languages', function() {

      var spy; 

      beforeEach(function(done) {
        i18n.backend(filesync);
        spy = sinon.spy(filesync, 'fetchOne');
        i18n.init(opts, function(t) { done(); });
      });

      afterEach(function() {
        spy.restore();
      });

      it('it should preload resources for languages', function(done) {
        spy.reset();
        i18n.preload('it-IT', function(t) {
            expect(spy.callCount).to.be(2); // it-IT, it
            done();
        });

      });

    });

    describe('save missing key', function() {

      beforeEach(function(done) {
        i18n.init(i18n.functions.extend(opts, { saveMissing: true }), function(t) { done(); } );
      });

      it('it shouldn\'t throw an error', function() {
        expect(i18n.t('missingTest')).to.be('missingTest');
      });

    });

  });

});