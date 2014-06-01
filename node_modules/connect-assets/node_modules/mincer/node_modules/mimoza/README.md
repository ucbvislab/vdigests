# Mimoza

[![Build Status](https://secure.travis-ci.org/nodeca/mimoza.png?branch=master)](http://travis-ci.org/nodeca/mimoza)

Mimoza is a tiny mime map library. It's a spin-off of the original [mime][1]
Node module, and happened due to need of some extra features.

[1]: https://github.com/bentomas/node-mime


## Usage overview

``` javascript
var Mimoza = require('mimoza');

// Use builtin mime types:
Mimoza.getExtension('audio/ogg');       // -> '.oga'
Mimoza.getMimeType('ogg');              // -> 'audio/ogg'
Mimoza.getMimeType('.oga');             // -> 'audio/ogg'
Mimoza.getMimeType('test.oga');         // -> 'audio/ogg'
Mimoza.getMimeType('foo/bar.oga');      // -> 'audio/ogg'

// Define your own map
var mime = new Mimoza({
  normalize: function (ext) {
    return '[' + ext.toLowerCase() + ']';
  },
  defaultType: 'hard/core'
});


mime.register('foo/bar', ['baz', 'moo']);
mime.getExtension('foo/bar');           // -> '[baz]'
mime.getMimeType('baz');                // -> 'foo/bar'
mime.getMimeType('[baz]');              // -> 'foo/bar'
mime.getMimeType('tada');               // -> 'hard/core'
mime.getMimeType('tada', 'soft/core');  // -> 'soft/core'
```

See the [API][2] docs for details.

[2]: http://nodeca.github.com/mimoza
