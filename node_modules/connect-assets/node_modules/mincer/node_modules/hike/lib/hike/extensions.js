/** internal
 *  class Extensions
 *
 *  Subclass of [[NormalizedArray]].
 *  Internal collection for tracking extension names.
 *  Each element is a valid filename extension (with leading dot).
 *
 *      var exts = new Extensions();
 *
 *      exts.append('js');
 *      exts.append('.css');
 *
 *      exts.toArray();
 *      // -> [".js", ".css"]
 **/


'use strict';


var NormalizedArray = require('./normalized_array');


/**
 *  new Extensions()
 **/
var Extensions = module.exports = function Extensions() {
  NormalizedArray.call(this);
};


require('util').inherits(Extensions, NormalizedArray);


/**
 *  Extensions#clone() -> Extensions
 *
 *  Return copy of the instance.
 **/
Extensions.prototype.clone = function () {
  var obj = new Extensions();
  obj.prepend(this.toArray());
  return obj;
};


/**
 *  Extensions.normalize(extension) -> String
 *  - extension (String): extension to normalize
 *
 *  Normalize extension with a leading `.`.
 *
 *      Extensions.normalize("js");
 *      // -> ".js"
 *
 *      Extensions.normalize(".css");
 *      // -> ".css"
 **/
Extensions.normalize = function (extension) {
  if ('.' === extension[0]) {
    return extension;
  }

  return '.' + extension;
};


/** alias of: Extensions.normalize
 *  Extensions#normalize(extension) -> String
 **/
Extensions.prototype.normalize = Extensions.normalize;
