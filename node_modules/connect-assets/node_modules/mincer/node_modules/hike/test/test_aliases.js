/*global describe, it, beforeEach*/


'use strict';


// stdlib
var assert = require('assert');


// internal
var Aliases = require('../lib/hike/aliases');


describe('Aliases', function () {
  var aliases;


  beforeEach(function () {
    aliases = new Aliases();
  });


  it('should always return an instance of Extensions', function () {
    aliases.append('foo', 'bar');

    assert.equal('.bar',  aliases.get('foo').toArray().join(','));
    assert.equal('',      aliases.get('moo').toArray().join(','));
  });


  it('should throw an error on attempt to modify when frozen', function () {
    aliases.append('foo', 'bar');
    aliases.freeze();

    assert.ok(aliases.frozen);

    assert.throws(function () { aliases.remove('foo', 'bar'); });
    assert.throws(function () { aliases.append('foo', 'baz'); });

    assert.doesNotThrow(function () { aliases.get('foo'); });
  });


  it('should freeze inner Extensions collections when frozen', function () {
    aliases.append('foo', 'bar');
    aliases.freeze();

    assert.ok(aliases.get('foo').frozen);
    assert.ok(aliases.get('moo').frozen);
  });
});
