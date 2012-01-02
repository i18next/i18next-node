(function() {

    var i18n = require('./dep/i18next-1.1')
      , root = this
      , wrapper = {};

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = wrapper;
    } 

    var f = {

        extend: function(target, source) {
            if (!source || typeof source === 'function') {
                return target;
            }
            
            for (var attr in source) { target[attr] = source[attr]; }
            return target;
        },

        each: function( object, callback, args ) {
            var name, i = 0,
                length = object.length,
                isObj = length === undefined || typeof object === "function";

            if ( args ) {
                if ( isObj ) {
                    for ( name in object ) {
                        if ( callback.apply( object[ name ], args ) === false ) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if ( callback.apply( object[ i++ ], args ) === false ) {
                            break;
                        }
                    }
                }

            // A special, fast, case for the most common use of each
            } else {
                if ( isObj ) {
                    for ( name in object ) {
                        if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
                            break;
                        }
                    }
                } else {
                    for ( ; i < length; ) {
                        if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
                            break;
                        }
                    }
                }
            }

            return object;
        },

        ajax: function() { return null; }
    };

    f.extend(i18n.functions, f);
    f.extend(wrapper, i18n);

})();