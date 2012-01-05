var i18n = require('../index')
  , assert = require('assert');


describe('i18next', function() {

    it('should be to init i18next without option', function(done) {
        i18n.init(function(t) {
            assert.equal(i18n.lng(),'dev');

            done();
        });
    });
});