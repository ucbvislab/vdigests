/** internal
 *  class Aliases
 *
 *  An internal class that holds map of extensions and it's aliases.
 **/


'use strict';


// 3rd-party
var _ = require('lodash');


// internal
var Extensions = require('./extensions');
var stub = require('./common').stub;


/**
 *  new Aliases()
 **/
function Aliases() {
  var frozen = false, map = {};


  /**
   *  NormalizedArray#frozen -> Boolean
   *
   *  Tells whenever object is frozen.
   **/
  Object.defineProperty(this, 'frozen', {
    get: function () { return frozen; }
  });


  /**
   *  Aliases#get(extension) -> Extensions
   *
   *  Returns [[Extensions]] collection of aliases for given `extension`.
   **/
  this.get = function (ext) {
    ext = Extensions.normalize(ext);

    if (!map[ext]) {
      map[ext] = new Extensions();

      if (frozen) {
        map[ext].freeze();
      }
    }

    return map[ext];
  };


  /**
   *  Aliases#prepend(extension, *aliases) -> Void
   *
   *  Prepends `aliases` for given `extension`.
   *  Syntax sugar for:
   *
   *      aliases.get('css').prepend('scss', 'styl');
   **/
  this.prepend = function (extension) {
    this.get(extension).prepend(_.flatten(arguments).slice(1));
  };


  /**
   *  Aliases#append(extension, *aliases) -> Void
   *
   *  Appends `aliases` for given `extension`.
   *  Syntax sugar for:
   *
   *      aliases.get('css').append('scss', 'styl');
   **/
  this.append = function (extension) {
    this.get(extension).append(_.flatten(arguments).slice(1));
  };


  /**
   *  Aliases#remove(extension, alias) -> Void
   *
   *  Remove given `alias` for the `extension`.
   **/
  this.remove = function (extension, alias) {
    this.get(extension).remove(alias);
  };


  /**
   *  Aliases#clone() -> Aliases
   *
   *  Return copy of the instance.
   **/
  this.clone = function () {
    var obj = new Aliases();

    _.each(map, function (aliases, ext) {
      obj.append(ext, aliases.toArray());
    });

    return obj;
  };


  /**
   *  Aliases#freeze() -> Aliases
   *
   *  Make object immutable.
   *  Once frozen, any attempt to mutate state will throw an error.
   **/
  this.freeze = function () {
    frozen = true;
    _.each(map, function (aliases) { aliases.freeze(); });
    stub(this, ['prepend', 'append', 'remove'], 'Frozen object.');
    return this;
  };


  /**
   *  Aliases#toObject() -> Object
   *
   *  Returns copy of the internal map.
   **/
  this.toObject = function () {
    return _.clone(map);
  };
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Aliases;
