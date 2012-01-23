var i18n = require('../index')
  , assert = require('assert');


describe('i18next', function() {

    it('should init i18next without option', function(done) {
        i18n.init(function(t) {
            assert.equal(typeof t,'function');

            done();
        });
    });
});