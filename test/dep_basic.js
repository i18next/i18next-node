var i18n = require('../lib/i18nextWrapper')
  , should = require('should');


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
            t('simpleTest_en-US').should.equal('ok_from_en-US');
            t('simpleTest_en').should.equal('ok_from_en');
            t('simpleTest_dev').should.equal('ok_from_dev');

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
            t('simpleTest').should.equal('ok_from_en-US');

            i18n.setLng('de-DE', function(t) {
                t('simpleTest').should.equal('ok_from_de-DE');

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
            t('nesting1').should.equal('1 2 3');
            t('pluralTest', {count: 1}).should.equal('no plural');
            t('pluralTest', {count: 2}).should.equal('plural');
            t('interpolationTest', {toAdd: 'something'}).should.equal('added something');

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
            t('beer', {count: 1}).should.equal('Pivo');
            t('beer', {count: 2}).should.equal('Pivi');
            t('beer', {count: 3}).should.equal('Piva');
            t('beer', {count: 4}).should.equal('Piva');
            t('beer', {count: 5}).should.equal('no idea ;)');

            done();
        });
    });

});