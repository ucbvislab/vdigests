/** internal
 *  class NormalizedArray
 *
 *  An internal abstract class that calls a callback `normalize`
 *  anytime an element is added to Array.
 *
 *  [[Extensions]] and [[Paths]] are subclasses of [[NormalizedArray]].
 **/


'use strict';


// 3rd-party
var _ = require('lodash');


// internal
var stub = require('./common').stub;


/**
 *  new NormalizedArray()
 **/
var NormalizedArray = module.exports = function () {
  var self = this, frozen = false, arr = [];


  function normalize_all(els) {
    return _.flatten(els).map(function (el) {
      return self.normalize(el);
    });
  }


  /**
   *  NormalizedArray#frozen -> Boolean
   *
   *  Tells whenever object is frozen.
   **/
  Object.defineProperty(this, 'frozen', {
    get: function () { return frozen; }
  });


  /**
   *  NormalizedArray#prepend(*els) -> Void
   *
   *  Prepend one or more elements to the head of the internal array.
   *  Only unique elements are left.
   *
   *  You can specify list of prepended elements as list of arguments or as an
   *  array, thus following are equal:
   *
   *      prepend(['foo', 'bar']);
   *      prepend('foo', 'bar');
   **/
  this.prepend = function () {
    arr = _.union(normalize_all(arguments), arr);
  };


  /**
   *  NormalizedArray#append(*els) -> Void
   *
   *  Append one or more elements to the tail of the internal array.
   *  Only unique elements are left.
   *
   *  You can specify list of appended elements as list of arguments or as an
   *  array, thus following are equal:
   *
   *      append(['foo', 'bar']);
   *      append('foo', 'bar');
   **/
  this.append = function () {
    arr = _.union(arr, normalize_all(arguments));
  };


  /**
   *  NormalizedArray#remove(el) -> Void
   *
   *  Remove given `el` from the internal array.
   **/
  this.remove = function (el) {
    arr = _.without(arr, self.normalize(el));
  };


  /**
   *  NormalizedArray#indexOf(element) -> Number
   *
   *  Returns index of given `element` starting from `0`.
   *  Returns `-1` when element not found.
   **/
  this.indexOf = function (element) {
    return arr.indexOf(this.normalize(element));
  };


  /**
   *  NormalizedArray#toArray() -> Array
   *
   *  Returns Array value of [[NormalizedArray]]
   **/
  this.toArray = function () {
    return arr.slice();
  };


  /**
   *  NormalizedArray#freeze() -> NormalizedArray
   *
   *  Make object immutable.
   *  Once frozen, any attempt to mutate state will throw an error.
   **/
  this.freeze = function () {
    frozen = true;
    stub(this, ['prepend', 'append', 'remove'], 'Frozen object.');
    return this;
  };
};


// should be implemented by subclasses
NormalizedArray.prototype.clone = function () {
  throw new Error('Not implemented');
};


// should be implemented by subclasses
NormalizedArray.prototype.normalize = function () {
  throw new Error('Not implemented');
};
