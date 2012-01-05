var i18n = require('../lib/i18nextWrapper')
  , assert = require('assert');


describe('Basic Dependency Functionality', function() {

    it('should be possible to pass in resStore', function(done) {
        i18n.init({
            lng: 'en-US',
            ns: 'translation',
            dynamicLoad: false,
            useLocalStorage: false,
            resStore: {
                dev: { translation: { simpleTest_dev: 'ok_from_dev' } },
                en: { translation: { simpleTest_en: 'ok_from_en' } },            
                'en-US': { translation: { 'simpleTest_en-US': 'ok_from_en-US' } }
            }
        }, function(t) {
            assert.equal(t('simpleTest_en-US'),'ok_from_en-US');
            assert.equal(t('simpleTest_en'),'ok_from_en');
            assert.equal(t('simpleTest_dev'),'ok_from_dev');

            done();
        });
    });

    it('should be possible to switch lng', function(done) {
        i18n.init({
            lng: 'en-US',
            ns: 'translation',
            useLocalStorage: false,
            resStore: {          
                'en-US': { translation: { 'simpleTest': 'ok_from_en-US' } },
                'de-DE': { translation: { 'simpleTest': 'ok_from_de-DE' } }
            }
        }, function(t) {
            assert.equal(t('simpleTest'),'ok_from_en-US');

            i18n.setLng('de-DE', function(t) {
                assert.equal(t('simpleTest'),'ok_from_de-DE');

                done();
            });
        });
    });

    it('should support basic functions', function(done) {
        i18n.init({
            lng: 'en-US',
            ns: 'translation',
            useLocalStorage: false,
            resStore: {
                dev: { translation: { 
                        nesting1: '1 $t(nesting2)'
                    } 
                },
                en: { translation: { 
                        nesting2: '2 $t(nesting3)' 
                    } 
                },            
                'en-US': { translation: { 
                        nesting3: '3',
                        pluralTest: 'no plural',
                        pluralTest_plural: 'plural',
                        interpolationTest: 'added __toAdd__'
                    } 
                }
            }
        }, function(t) {
            assert.equal(t('nesting1'),'1 2 3');
            assert.equal(t('pluralTest', {count: 1}),'no plural');
            assert.equal(t('pluralTest', {count: 2}),'plural');
            assert.equal(t('interpolationTest', {toAdd: 'something'}),'added something');

            done();
        });
    });

    it('should support extended plural functions', function(done) {
        i18n.init({
            lng: 'sl',
            ns: 'translation',
            useLocalStorage: false,
            resStore: {
                dev: { translation: { } },
                sl: { translation: { 
                        beer: 'Pivo',
                        beer_plural_two: 'Pivi',
                        beer_plural_few: 'Piva',
                        beer_plural: 'no idea ;)'
                    } 
                },            
                'sl-??': { translation: { } }
            }
        }, function(t) {
            assert.equal(t('beer', {count: 1}),'Pivo');
            assert.equal(t('beer', {count: 2}),'Pivi');
            assert.equal(t('beer', {count: 3}),'Piva');
            assert.equal(t('beer', {count: 4}),'Piva');
            assert.equal(t('beer', {count: 5}),'no idea ;)');

            done();
        });
    });

});