//////////////////////
// HINT
//
// you need to replace '_fetchOne' with 'fetchOne' to use this on server
//


var i18n = require('../index')
  , expect = require('expect.js')
  , sinon = require('sinon');

describe('i18next.init', function() {

  var opts;

  beforeEach(function(done) {
    opts = {
      lng: 'en-US',
      fallbackLng: 'dev',
      load: 'all',
      preload: [],
      supportedLngs: [],
      lowerCaseLng: false,
      ns: 'translation',
      resGetPath: 'test/locales/__lng__/__ns__.json',
      resSetPath: 'test/locales/__lng__/new.__ns__.json',
      saveMissing: false,
      resStore: false,
      returnObjectTrees: false,
      interpolationPrefix: '__',
      interpolationSuffix: '__',
      postProcess: '',
      debug: false
    };

    i18n.init(opts, function(t) {
      i18n.sync.resStore = {};
      done();
    });
  });

  // init/init.load.spec.js

  describe('advanced initialisation options', function() {

    //= init/init.addResourceBundle.spec.js

    //= init/init.loadBehaviour.spec.js

    //= init/init.preload.spec.js

    // init/init.syncFlag.spec.js

    //= init/init.namespace.spec.js

    // init/init.localstorage.spec.js

    //= init/init.varia.spec.js

  });

});