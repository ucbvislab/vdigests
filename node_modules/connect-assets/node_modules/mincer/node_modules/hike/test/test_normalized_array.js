/*global describe, it, beforeEach*/


'use strict';


// stdlib
var assert = require('assert');


// internal
var NormalizedArray = require('../lib/hike/normalized_array');


function UppercaseArray() { NormalizedArray.call(this); }
require('util').inherits(UppercaseArray, NormalizedArray);
UppercaseArray.prototype.normalize = function (el) { return el.toUpperCase(); };


describe('NormalizedArray', function () {
  var array;


  beforeEach(function () {
    array = new UppercaseArray();
  });


  it('should normalize prepended elements', function () {
    array.prepend(['a', 'b', 'c']);
    assert.equal('A,B,C', array.toArray().join(','));
  });


  it('should flatten array with prepended elements', function () {
    array.prepend([[['a', 'b', 'c']]]);
    assert.equal('A,B,C', array.toArray().join(','));
  });


  it('should insert prepended elements to the head', function () {
    array.prepend(['a']);
    array.prepend(['b']);
    array.prepend(['c']);
    assert.equal('C,B,A', array.toArray().join(','));
  });


  it('should push appended elements to the tail', function () {
    array.append(['a']);
    array.append(['b']);
    array.append(['c']);
    assert.equal('A,B,C', array.toArray().join(','));
  });


  it('should normalize appended elements', function () {
    array.append(['a', 'b', 'c']);
    assert.equal('A,B,C', array.toArray().join(','));
  });


  it('should flatten array with appended elements', function () {
    array.append([[['a', 'b', 'c']]]);
    assert.equal('A,B,C', array.toArray().join(','));
  });


  it('should allow remove element, respecting normalization', function () {
    array.append(['a', 'b', 'c']);

    array.remove('b');
    array.remove('C');

    assert.equal('A', array.toArray().join(','));
  });


  it('should throw an error on attempt to modify when frozen', function () {
    array.append(['foo']);
    array.freeze();

    assert.throws(function () { array.remove('foo'); });
    assert.throws(function () { array.append('bar'); });

    assert.doesNotThrow(function () { array.toArray(); });
  });


  it('should allow getting indexOf() element, respecting normalization', function () {
    array.append('foo');

    assert.equal(0, array.indexOf('FOO'));
    assert.equal(0, array.indexOf('foo'));
    assert.equal(-1, array.indexOf('bar'));
  });
});
