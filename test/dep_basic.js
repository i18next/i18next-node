var i18n = require('../lib/i18nextWrapper')
  , should = require('should');


describe('Basic Dependency Functionality', function() {

    console.log(i18n);

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

});