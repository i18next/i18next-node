var i18n = require('../index')
  , expect = require('expect.js')
  , sinon = require('sinon')
  , filesync = require('../lib/filesync');

describe('i18next.init.spec', function() {

  var opts;

  beforeEach(function() {
    opts = {
      lng: 'en-US',
      preload: [],
      lowerCaseLng: false,
      ns: 'translation',
      resGetPath: 'test/locales/__lng__/__ns__.json',
      saveMissing: false,
      resStore: false,
      returnObjectTrees: false,
      debug: false
    };
  });

  describe('Initialisation', function() {

    describe('with passed in resource set', function() {

      var resStore = {
        dev: { translation: { 'simple_dev': 'ok_from_dev' } },
        en: { translation: { 'simple_en': 'ok_from_en' } },            
        'en-US': { translation: { 'simple_en-US': 'ok_from_en-US' } }
      };
      
      beforeEach(function(done) {
        i18n.init( i18n.functions.extend(opts, { resStore: resStore }),
          function(t) { done(); });
      });

      it('it should provide passed in resources for translation', function() {
        expect(i18n.t('simple_en-US')).to.be('ok_from_en-US');
        expect(i18n.t('simple_en')).to.be('ok_from_en');
        expect(i18n.t('simple_dev')).to.be('ok_from_dev');
      });

    });

    describe('loading from filesystem', function() {

      describe('with static route', function() {

        beforeEach(function(done) {
          i18n.init(opts, function(t) { done(); });
        });

        it('it should provide loaded resources for translation', function() {
          expect(i18n.t('simple_en-US')).to.be('ok_from_en-US');
          expect(i18n.t('simple_en')).to.be('ok_from_en');
          expect(i18n.t('simple_dev')).to.be('ok_from_dev');
        });

      });

    });

    describe('advanced initialisation options', function() {

      describe('preloading multiple languages', function() {

        var spy; 

        beforeEach(function(done) {
          i18n.backend(filesync);
          spy = sinon.spy(filesync, 'fetchOne');
          i18n.init(i18n.functions.extend(opts, { 
              preload: ['fr', 'de-DE'] }),
            function(t) { done(); });
        });

        afterEach(function() {
          spy.restore();
        });

        it('it should load additional languages', function() {
          expect(spy.callCount).to.be(6); // en-US, en, de-DE, de, fr, dev
        });

        describe('changing the language', function() {

          beforeEach(function(done) {
            spy.reset();
            i18n.setLng('de-DE',
              function(t) { done(); });
          });

          it('it shouldn\'t reload the preloaded languages', function() {
            expect(spy.callCount).to.be(0); // de-DE, de, fr, dev
          });

        });

      });

      describe('with namespace', function() {

        describe('with one namespace set', function() {

          beforeEach(function(done) {
            i18n.init(i18n.functions.extend(opts, { ns: 'ns.special'} ),
              function(t) { done(); });
          });

          it('it should provide loaded resources for translation', function() {
            expect(i18n.t('simple_en-US')).to.be('ok_from_special_en-US');
            expect(i18n.t('simple_en')).to.be('ok_from_special_en');
            expect(i18n.t('simple_dev')).to.be('ok_from_special_dev');
          });

        });

        describe('with more than one namespace set', function() {

          beforeEach(function(done) {
            i18n.init(i18n.functions.extend(opts, { ns: { namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'} } ),
              function(t) { done(); });
          });

          it('it should provide loaded resources for translation', function() {
            // default ns
            expect(i18n.t('simple_en-US')).to.be('ok_from_special_en-US');
            expect(i18n.t('simple_en')).to.be('ok_from_special_en');
            expect(i18n.t('simple_dev')).to.be('ok_from_special_dev');

            // ns prefix
            expect(i18n.t('ns.common:simple_en-US')).to.be('ok_from_common_en-US');
            expect(i18n.t('ns.common:simple_en')).to.be('ok_from_common_en');
            expect(i18n.t('ns.common:simple_dev')).to.be('ok_from_common_dev');
          });

        });

      });

      describe('using function provided in callback\'s argument', function() {

        var cbT;

        beforeEach(function(done) {
          i18n.init(opts, function(t) { cbT = t; done(); });
        });

        it('it should provide loaded resources for translation', function() {
          expect(cbT('simple_en-US')).to.be('ok_from_en-US');
          expect(cbT('simple_en')).to.be('ok_from_en');
          expect(cbT('simple_dev')).to.be('ok_from_dev');
        });

      });

      describe('with lowercase flag', function() {

        describe('default behaviour will uppercase specifc country part.', function() {

          beforeEach(function() {
            i18n.init(i18n.functions.extend(opts, { 
              lng: 'en-us',
              resStore: {
                'en-US': { translation: { 'simple_en-US': 'ok_from_en-US' } }
              }
            }, function(t) { done(); }) );
          });

          it('it should translate the uppercased lng value', function() {
            expect(i18n.t('simple_en-US')).to.be('ok_from_en-US');
          });

          it('it should get uppercased set language', function() {
            expect(i18n.lng()).to.be('en-US');
          });

        });

        describe('overridden behaviour will accept lowercased country part.', function() {

          beforeEach(function() {
            i18n.init(i18n.functions.extend(opts, { 
              lng: 'en-us',
              lowerCaseLng: true,
              resStore: {
                'en-us': { translation: { 'simple_en-us': 'ok_from_en-us' } }
              }
            }, function(t) { done(); }) );
          });

          it('it should translate the lowercase lng value', function() {
            expect(i18n.t('simple_en-us')).to.be('ok_from_en-us');
          });

          it('it should get lowercased set language', function() {
            expect(i18n.lng()).to.be('en-us');
          });

        });

     });

    });

  });

});